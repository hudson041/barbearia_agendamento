-- =====================================================================
-- AGENDAMENTO MANUAL NO PAINEL — rode no SQL Editor do Supabase
--
-- 1. horario_barbeiro_livre(): checagem de sobreposição (uso interno)
-- 2. criar_agendamento_publico(): mesma função de hoje + checagem de
--    sobreposição (antes só havia a trava de horário exato)
-- 3. criar_agendamento_manual(): para o admin/barbeiro logado marcar no painel
--
-- ANTES DE RODAR: a coluna "origem" recebe aqui o valor 'balcao'. Se ela for
-- enum ou tiver CHECK, confirme que esse valor é aceito:
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'agendamentos'::regclass and contype = 'c';
--
--   select column_name, data_type, udt_name
--   from information_schema.columns
--   where table_name = 'agendamentos' and column_name in ('origem', 'status');
--
-- Se 'balcao' não for aceito, troque o literal nas 2 linhas marcadas
-- com "-- ORIGEM" mais abaixo (só a função manual usa).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Existe agendamento ativo do barbeiro que se sobrepõe ao intervalo?
--    Só as funções abaixo usam; ninguém de fora consegue chamar.
-- ---------------------------------------------------------------------
create or replace function public.horario_barbeiro_livre(
    p_barbeiro_id uuid,
    p_inicio      timestamptz,
    p_duracao     int
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select not exists (
        select 1
        from agendamentos a
        where a.barbeiro_id = p_barbeiro_id
          and a.status::text not in ('cancelado', 'no_show')
          and a.data_hora < p_inicio + make_interval(mins => p_duracao)
          and a.data_hora + make_interval(mins => a.duracao_min) > p_inicio
    );
$$;

revoke all on function public.horario_barbeiro_livre(uuid, timestamptz, int)
    from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Função pública: idêntica à atual, com a checagem de sobreposição.
--    O pg_advisory_xact_lock faz dois pedidos simultâneos para o mesmo
--    barbeiro entrarem um de cada vez, senão ambos poderiam passar na
--    checagem. A sobreposição devolve o código 23505, que o BookingFlow
--    já trata como "horário acabou de ser reservado".
-- ---------------------------------------------------------------------
create or replace function public.criar_agendamento_publico(
    p_slug        text,
    p_nome        text,
    p_telefone    text,
    p_barbeiro_id uuid,
    p_servico_id  uuid,
    p_data_hora   timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_barbearia       barbearias%rowtype;
    v_servico         servicos%rowtype;
    v_telefone        text;
    v_cliente_id      uuid;
    v_agendamento_id  uuid;
begin
    v_telefone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');

    if length(trim(coalesce(p_nome, ''))) < 2 or length(trim(p_nome)) > 100 then
        raise exception 'Informe um nome válido.';
    end if;

    if length(v_telefone) < 10 or length(v_telefone) > 13 then
        raise exception 'Informe um telefone válido, com DDD.';
    end if;

    if p_data_hora is null or p_data_hora <= now() then
        raise exception 'Escolha um horário no futuro.';
    end if;

    select * into v_barbearia
    from barbearias
    where slug = p_slug and status in ('trial', 'ativo');

    if not found then
        raise exception 'Esta barbearia não está disponível para agendamentos.';
    end if;

    select * into v_servico
    from servicos
    where id = p_servico_id
      and barbearia_id = v_barbearia.id
      and ativo;

    if not found then
        raise exception 'Serviço inválido.';
    end if;

    perform 1
    from barbeiros
    where id = p_barbeiro_id
      and barbearia_id = v_barbearia.id
      and ativo;

    if not found then
        raise exception 'Profissional inválido.';
    end if;

    -- NOVO: trava por barbeiro + checagem de sobreposição
    perform pg_advisory_xact_lock(hashtext(p_barbeiro_id::text));
    if not horario_barbeiro_livre(p_barbeiro_id, p_data_hora, v_servico.duracao_min) then
        raise exception 'Esse horário acabou de ser reservado por outra pessoa. Escolha outro.'
            using errcode = '23505';
    end if;

    insert into clientes (barbearia_id, nome, telefone)
    values (v_barbearia.id, trim(p_nome), v_telefone)
    on conflict (barbearia_id, telefone)
    do update set telefone = excluded.telefone
    returning id into v_cliente_id;

    insert into agendamentos (
        barbearia_id, cliente_id, barbeiro_id, servico_id,
        data_hora, duracao_min, status, origem
    )
    values (
        v_barbearia.id, v_cliente_id, p_barbeiro_id, v_servico.id,
        p_data_hora, v_servico.duracao_min, 'aguardando', 'app'
    )
    returning id into v_agendamento_id;

    return v_agendamento_id;
end;
$function$;

-- ---------------------------------------------------------------------
-- 3. Agendamento manual (painel). A barbearia NÃO vem do cliente: sai do
--    perfil do usuário logado, então ninguém marca em outra barbearia.
--    Entra como 'confirmado', pois o próprio barbeiro está marcando.
-- ---------------------------------------------------------------------
create or replace function public.criar_agendamento_manual(
    p_nome        text,
    p_telefone    text,
    p_barbeiro_id uuid,
    p_servico_id  uuid,
    p_data_hora   timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
    v_barbearia_id    uuid;
    v_servico         servicos%rowtype;
    v_telefone        text;
    v_cliente_id      uuid;
    v_agendamento_id  uuid;
begin
    if auth.uid() is null then
        raise exception 'Faça login para continuar.';
    end if;

    select p.barbearia_id into v_barbearia_id
    from profiles p
    where p.id = auth.uid()
      and p.role::text in ('admin', 'barbeiro')
      and p.barbearia_id is not null;

    if v_barbearia_id is null then
        raise exception 'Você não tem permissão para criar agendamentos.';
    end if;

    v_telefone := regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g');

    if length(trim(coalesce(p_nome, ''))) < 2 or length(trim(p_nome)) > 100 then
        raise exception 'Informe um nome válido.';
    end if;

    if length(v_telefone) < 10 or length(v_telefone) > 13 then
        raise exception 'Informe um telefone válido, com DDD.';
    end if;

    -- Tolera 1h no passado: o cliente que acabou de chegar no balcão
    if p_data_hora is null or p_data_hora < now() - interval '1 hour' then
        raise exception 'Escolha um horário que ainda não passou.';
    end if;

    select * into v_servico
    from servicos
    where id = p_servico_id and barbearia_id = v_barbearia_id and ativo;

    if not found then
        raise exception 'Serviço inválido.';
    end if;

    perform 1
    from barbeiros
    where id = p_barbeiro_id and barbearia_id = v_barbearia_id and ativo;

    if not found then
        raise exception 'Profissional inválido.';
    end if;

    perform pg_advisory_xact_lock(hashtext(p_barbeiro_id::text));
    if not horario_barbeiro_livre(p_barbeiro_id, p_data_hora, v_servico.duracao_min) then
        raise exception 'Esse horário já está ocupado.' using errcode = '23505';
    end if;

    insert into clientes (barbearia_id, nome, telefone)
    values (v_barbearia_id, trim(p_nome), v_telefone)
    on conflict (barbearia_id, telefone)
    do update set telefone = excluded.telefone
    returning id into v_cliente_id;

    insert into agendamentos (
        barbearia_id, cliente_id, barbeiro_id, servico_id,
        data_hora, duracao_min, status, origem
    )
    values (
        v_barbearia_id, v_cliente_id, p_barbeiro_id, v_servico.id,
        p_data_hora, v_servico.duracao_min, 'confirmado', 'balcao'  -- ORIGEM
    )
    returning id into v_agendamento_id;

    return v_agendamento_id;
end;
$function$;

revoke all on function public.criar_agendamento_manual(text, text, uuid, uuid, timestamptz)
    from public, anon;
grant execute on function public.criar_agendamento_manual(text, text, uuid, uuid, timestamptz)
    to authenticated;
