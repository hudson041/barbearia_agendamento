-- =====================================================================
-- HORÁRIOS LIVRES — rode no SQL Editor do Supabase
--
-- 1. Tabela horarios_funcionamento (o horário deixa de ser fixo no código)
-- 2. Função horarios_disponiveis(): devolve SÓ horários de início livres,
--    sem nome, telefone ou qualquer dado de cliente. A tabela agendamentos
--    continua sem leitura pública; a função roda com security definer.
--
-- Pode rodar mais de uma vez sem duplicar nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Horário de funcionamento
--    dia_semana: 0 = domingo ... 6 = sábado (mesmo padrão do Postgres).
--    Pode haver mais de uma linha por dia (ex.: 08–12 e 14–19 = pausa
--    para o almoço).
-- ---------------------------------------------------------------------
create table if not exists horarios_funcionamento (
    id           uuid primary key default gen_random_uuid(),
    barbearia_id uuid not null references barbearias(id) on delete cascade,
    dia_semana   smallint not null check (dia_semana between 0 and 6),
    abre         time not null,
    fecha        time not null,
    ativo        boolean not null default true,
    check (fecha > abre)
);

create index if not exists horarios_funcionamento_barbearia_idx
    on horarios_funcionamento (barbearia_id, dia_semana);

alter table horarios_funcionamento enable row level security;

drop policy if exists "horarios: leitura publica" on horarios_funcionamento;
create policy "horarios: leitura publica"
    on horarios_funcionamento for select
    using (true);

-- O admin da barbearia gerencia o próprio horário (será usado no painel)
drop policy if exists "horarios: admin gerencia" on horarios_funcionamento;
create policy "horarios: admin gerencia"
    on horarios_funcionamento for all
    to authenticated
    using (
        barbearia_id in (
            select p.barbearia_id from profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    )
    with check (
        barbearia_id in (
            select p.barbearia_id from profiles p
            where p.id = auth.uid() and p.role = 'admin'
        )
    );

-- Carga inicial: reproduz o que estava fixo no código (08h às 19h, todos
-- os dias). AJUSTE depois: ex. desative o domingo (dia_semana = 0).
insert into horarios_funcionamento (barbearia_id, dia_semana, abre, fecha)
select b.id, d, time '08:00', time '19:00'
from barbearias b
cross join generate_series(0, 6) as d
where b.slug = 'barbearia-do-lenon'
  and not exists (
      select 1 from horarios_funcionamento h where h.barbearia_id = b.id
  );

-- ---------------------------------------------------------------------
-- 2. Função pública: horários livres de um barbeiro, para um serviço,
--    em uma data. Considera:
--      - horário de funcionamento do dia
--      - duração do serviço (o atendimento tem que caber antes de fechar
--        e sem esbarrar no próximo agendamento)
--      - agendamentos ativos (cancelado e no_show liberam o horário)
--      - horários que já passaram (hoje)
--    Os horários saem a cada 30 minutos, como antes.
-- ---------------------------------------------------------------------
create or replace function public.horarios_disponiveis(
    p_slug        text,
    p_barbeiro_id uuid,
    p_servico_id  uuid,
    p_data        date
)
returns table (inicio timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    v_fuso         constant text := 'America/Sao_Paulo';
    v_passo        constant interval := interval '30 minutes';
    v_barbearia_id uuid;
    v_duracao      int;
    v_hoje         date := (now() at time zone 'America/Sao_Paulo')::date;
begin
    -- Limita a janela de consulta (evita varredura de datas absurdas)
    if p_data is null or p_data < v_hoje or p_data > v_hoje + 90 then
        return;
    end if;

    select b.id into v_barbearia_id
    from barbearias b
    where b.slug = p_slug
      and coalesce(b.status::text, '') not in ('cancelado', 'suspenso');
    if v_barbearia_id is null then return; end if;

    select s.duracao_min into v_duracao
    from servicos s
    where s.id = p_servico_id and s.barbearia_id = v_barbearia_id and s.ativo;
    if v_duracao is null then return; end if;

    perform 1
    from barbeiros br
    where br.id = p_barbeiro_id and br.barbearia_id = v_barbearia_id and br.ativo;
    if not found then return; end if;

    return query
    with janelas as (
        select (p_data + h.abre)  at time zone v_fuso as ini,
               (p_data + h.fecha) at time zone v_fuso as fim
        from horarios_funcionamento h
        where h.barbearia_id = v_barbearia_id
          and h.dia_semana   = extract(dow from p_data)::int
          and h.ativo
    ),
    candidatos as (
        select g as slot
        from janelas j,
             generate_series(j.ini, j.fim - make_interval(mins => v_duracao), v_passo) as g
    )
    select c.slot
    from candidatos c
    where c.slot > now()
      and not exists (
          select 1
          from agendamentos a
          where a.barbeiro_id = p_barbeiro_id
            and a.status::text not in ('cancelado', 'no_show')
            and a.data_hora < c.slot + make_interval(mins => v_duracao)
            and a.data_hora + make_interval(mins => a.duracao_min) > c.slot
      )
    order by c.slot;
end;
$$;

revoke all on function public.horarios_disponiveis(text, uuid, uuid, date) from public;
grant execute on function public.horarios_disponiveis(text, uuid, uuid, date) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Conferência (troque os ids por reais): deve listar só horários
--    select * from horarios_disponiveis(
--        'barbearia-do-lenon',
--        '<id do barbeiro>', '<id do serviço>', current_date + 1);
-- ---------------------------------------------------------------------
