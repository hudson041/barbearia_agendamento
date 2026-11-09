'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { supabase } from '@/lib/supabaseClient';

/* ========================================================================
   Helpers e estilos
   ======================================================================== */

const BTN_BASE = 'min-h-11 px-4 font-body text-sm transition-colors disabled:opacity-50';
const BTN_PRIMARIO = `${BTN_BASE} bg-ink text-paper hover:bg-ink/90`;
const BTN_SECUNDARIO = `${BTN_BASE} border border-ink/30 hover:border-ink`;
const CAMPO = 'w-full border border-ink/20 bg-transparent px-3 py-2 min-h-11 font-body';
const CAMPO_HORA = 'border border-ink/20 bg-transparent px-3 py-2 min-h-11 font-body';
const ROTULO = 'font-body text-xs text-ink-soft block mb-1';

function formatarPreco(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Aceita "40", "40,00", "40.5" e "1.234,50". Devolve centavos ou null se inválido.
function precoParaCentavos(texto: string): number | null {
  let t = texto.replace(/[^\d.,]/g, '');
  if (!t) return null;
  // Com vírgula, os pontos são separadores de milhar; sem vírgula, o ponto é decimal
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 10000) return null;
  return Math.round(n * 100);
}

function centavosParaTexto(centavos: number) {
  return (centavos / 100).toFixed(2).replace('.', ',');
}

function Mensagem({ erro, sucesso }: { erro: string | null; sucesso?: string | null }) {
  if (erro) {
    return (
      <p role="alert" className="font-body text-sm text-burgundy">
        {erro}
      </p>
    );
  }
  if (sucesso) {
    return (
      <p role="status" className="font-body text-sm text-moss font-medium">
        {sucesso}
      </p>
    );
  }
  return null;
}

/* ========================================================================
   Tela principal, com as quatro seções
   ======================================================================== */

type Aba = 'servicos' | 'profissionais' | 'horarios' | 'dados';

const ABAS: { id: Aba; rotulo: string }[] = [
  { id: 'servicos', rotulo: 'Serviços' },
  { id: 'profissionais', rotulo: 'Profissionais' },
  { id: 'horarios', rotulo: 'Horários' },
  { id: 'dados', rotulo: 'Dados' },
];

export default function Configuracoes({
  barbeariaId,
  nomeBarbearia,
  onVoltar,
  onNomeAlterado,
}: {
  barbeariaId: string;
  nomeBarbearia: string;
  onVoltar: () => void;
  onNomeAlterado: (nome: string) => void;
}) {
  const [aba, setAba] = useState<Aba>('servicos');

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="font-body text-xs text-ink-soft">{nomeBarbearia}</p>
            <h1 className="font-display text-2xl leading-tight">Configurações</h1>
          </div>
          <button
            onClick={onVoltar}
            className="font-body text-sm text-ink-soft underline underline-offset-4 min-h-11 px-2"
          >
            ← Agenda
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <nav aria-label="Seções" className="flex gap-1 overflow-x-auto border-b border-ink/10">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              aria-current={aba === a.id ? 'true' : undefined}
              className={`shrink-0 min-h-11 px-4 font-body text-sm -mb-px border-b-2 transition-colors ${
                aba === a.id
                  ? 'border-ink text-ink font-medium'
                  : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {a.rotulo}
            </button>
          ))}
        </nav>

        {aba === 'servicos' && <Servicos barbeariaId={barbeariaId} />}
        {aba === 'profissionais' && <Profissionais barbeariaId={barbeariaId} />}
        {aba === 'horarios' && <Horarios barbeariaId={barbeariaId} />}
        {aba === 'dados' && (
          <DadosBarbearia barbeariaId={barbeariaId} onNomeAlterado={onNomeAlterado} />
        )}
      </div>
    </main>
  );
}

/* ========================================================================
   Serviços
   ======================================================================== */

type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
  ativo: boolean;
};

type FormServico = { id: string | null; nome: string; duracao: string; preco: string };

function Servicos({ barbeariaId }: { barbeariaId: string }) {
  const [lista, setLista] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormServico | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('servicos')
      .select('id, nome, duracao_min, preco_centavos, ativo')
      .eq('barbearia_id', barbeariaId)
      .order('ativo', { ascending: false })
      .order('nome');

    if (error) setErro('Não foi possível carregar os serviços.');
    else setLista((data as Servico[]) ?? []);
    setCarregando(false);
  }, [barbeariaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;

    const nome = form.nome.trim();
    const duracao = Number(form.duracao);
    const preco = precoParaCentavos(form.preco);

    if (nome.length < 2 || nome.length > 60) {
      setErro('Informe um nome com 2 a 60 caracteres.');
      return;
    }
    if (!Number.isInteger(duracao) || duracao < 5 || duracao > 480) {
      setErro('A duração deve ser um número inteiro de minutos, entre 5 e 480.');
      return;
    }
    if (preco === null) {
      setErro('Informe um preço válido, por exemplo 40 ou 40,00.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const dados = { nome, duracao_min: duracao, preco_centavos: preco };

    const { data, error } = form.id
      ? await supabase
          .from('servicos')
          .update(dados)
          .eq('id', form.id)
          .eq('barbearia_id', barbeariaId)
          .select('id')
      : await supabase
          .from('servicos')
          .insert({ ...dados, barbearia_id: barbeariaId, ativo: true })
          .select('id');

    setSalvando(false);

    if (error || !data || data.length === 0) {
      console.error('Erro ao salvar serviço:', error);
      setErro('Não foi possível salvar o serviço.');
      return;
    }

    setForm(null);
    await carregar();
  }

  async function alternarAtivo(s: Servico) {
    setErro(null);

    const { data, error } = await supabase
      .from('servicos')
      .update({ ativo: !s.ativo })
      .eq('id', s.id)
      .eq('barbearia_id', barbeariaId)
      .select('id');

    if (error || !data || data.length === 0) {
      console.error('Erro ao alterar serviço:', error);
      setErro('Não foi possível alterar o serviço.');
      return;
    }
    await carregar();
  }

  return (
    <section className="space-y-4">
      <p className="font-body text-sm text-ink-soft">
        Serviços desativados somem da página de agendamento, mas os agendamentos já feitos
        continuam no histórico.
      </p>

      <Mensagem erro={erro} />

      {!form && (
        <button
          onClick={() => {
            setErro(null);
            setForm({ id: null, nome: '', duracao: '30', preco: '' });
          }}
          className={`${BTN_PRIMARIO} w-full`}
        >
          + Novo serviço
        </button>
      )}

      {form && (
        <form onSubmit={salvar} className="border border-ink/20 p-4 space-y-3">
          <h2 className="font-display text-xl">{form.id ? 'Editar serviço' : 'Novo serviço'}</h2>

          <div>
            <label htmlFor="servico-nome" className={ROTULO}>
              Nome
            </label>
            <input
              id="servico-nome"
              className={CAMPO}
              value={form.nome}
              maxLength={60}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Ex.: Corte de cabelo"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="servico-duracao" className={ROTULO}>
                Duração (minutos)
              </label>
              <input
                id="servico-duracao"
                className={CAMPO}
                type="number"
                inputMode="numeric"
                min={5}
                max={480}
                step={5}
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="servico-preco" className={ROTULO}>
                Preço (R$)
              </label>
              <input
                id="servico-preco"
                className={CAMPO}
                type="text"
                inputMode="decimal"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                placeholder="40,00"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className={`${BTN_PRIMARIO} flex-1`}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => {
                setForm(null);
                setErro(null);
              }}
              className={BTN_SECUNDARIO}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="font-body text-ink-soft py-6 text-center">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="font-body text-ink-soft py-6 text-center">Nenhum serviço cadastrado.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((s) => (
            <li
              key={s.id}
              className={`border-l-4 ${s.ativo ? 'border-brass' : 'border-ink/20'} bg-ink/5 p-4`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className={`font-body font-medium ${s.ativo ? '' : 'text-ink-soft'}`}>
                  {s.nome}
                </p>
                <p className="font-display text-lg shrink-0">{formatarPreco(s.preco_centavos)}</p>
              </div>
              <p className="font-body text-sm text-ink-soft">
                {s.duracao_min} min{s.ativo ? '' : ' · Desativado'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setErro(null);
                    setForm({
                      id: s.id,
                      nome: s.nome,
                      duracao: String(s.duracao_min),
                      preco: centavosParaTexto(s.preco_centavos),
                    });
                  }}
                  className={BTN_SECUNDARIO}
                >
                  Editar
                </button>
                <button onClick={() => alternarAtivo(s)} className={BTN_SECUNDARIO}>
                  {s.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ========================================================================
   Profissionais
   ======================================================================== */

type Profissional = {
  id: string;
  nome: string;
  especialidades: string[] | null;
  ativo: boolean;
};

type FormProfissional = { id: string | null; nome: string; especialidades: string };

function especialidadesParaLista(texto: string): string[] {
  return texto
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 6)
    .map((t) => t.slice(0, 30));
}

function Profissionais({ barbeariaId }: { barbeariaId: string }) {
  const [lista, setLista] = useState<Profissional[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [form, setForm] = useState<FormProfissional | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('barbeiros')
      .select('id, nome, especialidades, ativo')
      .eq('barbearia_id', barbeariaId)
      .order('ativo', { ascending: false })
      .order('nome');

    if (error) setErro('Não foi possível carregar os profissionais.');
    else setLista((data as Profissional[]) ?? []);
    setCarregando(false);
  }, [barbeariaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form) return;

    const nome = form.nome.trim();
    if (nome.length < 2 || nome.length > 60) {
      setErro('Informe um nome com 2 a 60 caracteres.');
      return;
    }

    setSalvando(true);
    setErro(null);

    const dados = { nome, especialidades: especialidadesParaLista(form.especialidades) };

    const { data, error } = form.id
      ? await supabase
          .from('barbeiros')
          .update(dados)
          .eq('id', form.id)
          .eq('barbearia_id', barbeariaId)
          .select('id')
      : await supabase
          .from('barbeiros')
          .insert({ ...dados, barbearia_id: barbeariaId, ativo: true })
          .select('id');

    setSalvando(false);

    if (error || !data || data.length === 0) {
      console.error('Erro ao salvar profissional:', error);
      setErro('Não foi possível salvar o profissional.');
      return;
    }

    setForm(null);
    await carregar();
  }

  async function alternarAtivo(p: Profissional) {
    setErro(null);

    const ativosAgora = lista.filter((x) => x.ativo).length;
    if (
      p.ativo &&
      ativosAgora <= 1 &&
      !window.confirm(
        'Este é o único profissional ativo. Sem ele, ninguém consegue agendar. Desativar mesmo assim?'
      )
    ) {
      return;
    }

    const { data, error } = await supabase
      .from('barbeiros')
      .update({ ativo: !p.ativo })
      .eq('id', p.id)
      .eq('barbearia_id', barbeariaId)
      .select('id');

    if (error || !data || data.length === 0) {
      console.error('Erro ao alterar profissional:', error);
      setErro('Não foi possível alterar o profissional.');
      return;
    }
    await carregar();
  }

  return (
    <section className="space-y-4">
      <p className="font-body text-sm text-ink-soft">
        Quem está ativo aparece na página de agendamento. Profissionais desativados mantêm o
        histórico de atendimentos.
      </p>

      <Mensagem erro={erro} />

      {!form && (
        <button
          onClick={() => {
            setErro(null);
            setForm({ id: null, nome: '', especialidades: '' });
          }}
          className={`${BTN_PRIMARIO} w-full`}
        >
          + Novo profissional
        </button>
      )}

      {form && (
        <form onSubmit={salvar} className="border border-ink/20 p-4 space-y-3">
          <h2 className="font-display text-xl">
            {form.id ? 'Editar profissional' : 'Novo profissional'}
          </h2>

          <div>
            <label htmlFor="prof-nome" className={ROTULO}>
              Nome
            </label>
            <input
              id="prof-nome"
              className={CAMPO}
              value={form.nome}
              maxLength={60}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="prof-esp" className={ROTULO}>
              Especialidades (separadas por vírgula, opcional)
            </label>
            <input
              id="prof-esp"
              className={CAMPO}
              value={form.especialidades}
              onChange={(e) => setForm({ ...form, especialidades: e.target.value })}
              placeholder="Corte degradê, Barba"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={salvando} className={`${BTN_PRIMARIO} flex-1`}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button
              type="button"
              disabled={salvando}
              onClick={() => {
                setForm(null);
                setErro(null);
              }}
              className={BTN_SECUNDARIO}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {carregando ? (
        <p className="font-body text-ink-soft py-6 text-center">Carregando…</p>
      ) : lista.length === 0 ? (
        <p className="font-body text-ink-soft py-6 text-center">
          Nenhum profissional cadastrado.
        </p>
      ) : (
        <ul className="space-y-3">
          {lista.map((p) => (
            <li
              key={p.id}
              className={`border-l-4 ${p.ativo ? 'border-brass' : 'border-ink/20'} bg-ink/5 p-4`}
            >
              <p className={`font-body font-medium ${p.ativo ? '' : 'text-ink-soft'}`}>{p.nome}</p>
              <p className="font-body text-sm text-ink-soft">
                {p.especialidades && p.especialidades.length > 0
                  ? p.especialidades.join(' · ')
                  : 'Sem especialidades'}
                {p.ativo ? '' : ' · Desativado'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setErro(null);
                    setForm({
                      id: p.id,
                      nome: p.nome,
                      especialidades: (p.especialidades ?? []).join(', '),
                    });
                  }}
                  className={BTN_SECUNDARIO}
                >
                  Editar
                </button>
                <button onClick={() => alternarAtivo(p)} className={BTN_SECUNDARIO}>
                  {p.ativo ? 'Desativar' : 'Reativar'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ========================================================================
   Horários de funcionamento
   (cada dia pode ter mais de um intervalo: manhã e tarde, por exemplo)
   ======================================================================== */

const DIAS_SEMANA = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

// Exibição de segunda a domingo; o banco usa 0 = domingo
const ORDEM_EXIBICAO = [1, 2, 3, 4, 5, 6, 0];

type Janela = { abre: string; fecha: string };
type DiaConfig = { aberto: boolean; janelas: Janela[] };

function diasVazios(): DiaConfig[] {
  return Array.from({ length: 7 }, () => ({ aberto: false, janelas: [] }));
}

function Horarios({ barbeariaId }: { barbeariaId: string }) {
  const [dias, setDias] = useState<DiaConfig[]>(diasVazios);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('horarios_funcionamento')
      .select('dia_semana, abre, fecha, ativo')
      .eq('barbearia_id', barbeariaId)
      .eq('ativo', true)
      .order('abre');

    if (error) {
      setErro('Não foi possível carregar os horários.');
      setCarregando(false);
      return;
    }

    const novos = diasVazios();
    for (const r of (data ?? []) as { dia_semana: number; abre: string; fecha: string }[]) {
      const d = novos[r.dia_semana];
      if (!d) continue;
      // O banco devolve "08:00:00"; o campo de hora usa "08:00"
      d.janelas.push({ abre: r.abre.slice(0, 5), fecha: r.fecha.slice(0, 5) });
      d.aberto = true;
    }
    setDias(novos);
    setCarregando(false);
  }, [barbeariaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  function alterarDia(dia: number, mudar: (d: DiaConfig) => DiaConfig) {
    setSucesso(null);
    setDias((atual) => atual.map((d, i) => (i === dia ? mudar(d) : d)));
  }

  function alternarDia(dia: number) {
    alterarDia(dia, (d) =>
      d.aberto
        ? { ...d, aberto: false }
        : {
            aberto: true,
            janelas: d.janelas.length > 0 ? d.janelas : [{ abre: '08:00', fecha: '19:00' }],
          }
    );
  }

  function alterarJanela(dia: number, indice: number, campo: 'abre' | 'fecha', valor: string) {
    alterarDia(dia, (d) => ({
      ...d,
      janelas: d.janelas.map((j, k) => (k === indice ? { ...j, [campo]: valor } : j)),
    }));
  }

  function adicionarJanela(dia: number) {
    alterarDia(dia, (d) => ({ ...d, janelas: [...d.janelas, { abre: '14:00', fecha: '18:00' }] }));
  }

  function removerJanela(dia: number, indice: number) {
    alterarDia(dia, (d) => ({ ...d, janelas: d.janelas.filter((_, k) => k !== indice) }));
  }

  async function salvar() {
    setErro(null);
    setSucesso(null);

    const payload: { dia_semana: number; abre: string; fecha: string }[] = [];

    for (const dia of ORDEM_EXIBICAO) {
      const d = dias[dia];
      if (!d.aberto) continue;

      const ordenadas = [...d.janelas].sort((a, b) => a.abre.localeCompare(b.abre));

      for (let i = 0; i < ordenadas.length; i++) {
        const j = ordenadas[i];

        if (!j.abre || !j.fecha) {
          setErro(`${DIAS_SEMANA[dia]}: preencha os dois horários.`);
          return;
        }
        if (j.abre >= j.fecha) {
          setErro(`${DIAS_SEMANA[dia]}: o fechamento deve ser depois da abertura.`);
          return;
        }
        if (i > 0 && j.abre < ordenadas[i - 1].fecha) {
          setErro(`${DIAS_SEMANA[dia]}: os intervalos estão se sobrepondo.`);
          return;
        }
        payload.push({ dia_semana: dia, abre: j.abre, fecha: j.fecha });
      }
    }

    if (
      payload.length === 0 &&
      !window.confirm('Todos os dias estão fechados: ninguém conseguirá agendar. Salvar mesmo assim?')
    ) {
      return;
    }

    setSalvando(true);

    // A gravação é uma função do banco: troca todos os horários de uma vez, sem
    // risco de ficar com a agenda pela metade se a conexão cair no meio.
    const { error } = await supabase.rpc('salvar_horarios_funcionamento', {
      p_janelas: payload,
    });

    setSalvando(false);

    if (error) {
      console.error('Erro ao salvar horários:', error);
      setErro(
        error.code === 'P0001' ? error.message : 'Não foi possível salvar os horários.'
      );
      return;
    }

    setSucesso('Horários salvos.');
    await carregar();
  }

  if (carregando) {
    return <p className="font-body text-ink-soft py-6 text-center">Carregando…</p>;
  }

  return (
    <section className="space-y-4">
      <p className="font-body text-sm text-ink-soft">
        Marque os dias em que a barbearia abre. Para fechar para o almoço, adicione um segundo
        intervalo (por exemplo, 08:00 às 12:00 e 14:00 às 19:00). Os agendamentos já feitos não
        são alterados.
      </p>

      <ul>
        {ORDEM_EXIBICAO.map((dia) => {
          const d = dias[dia];
          return (
            <li key={dia} className="border-b border-ink/10 py-3">
              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-3 font-body min-h-11 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.aberto}
                    onChange={() => alternarDia(dia)}
                    className="size-5 accent-ink"
                  />
                  {DIAS_SEMANA[dia]}
                </label>
                {!d.aberto && <span className="font-body text-sm text-ink-soft">Fechado</span>}
              </div>

              {d.aberto && (
                <div className="mt-2 space-y-2 pl-8">
                  {d.janelas.map((j, i) => (
                    <div key={i} className="flex flex-wrap items-center gap-2">
                      <input
                        type="time"
                        aria-label={`${DIAS_SEMANA[dia]}: abre às`}
                        value={j.abre}
                        onChange={(e) => alterarJanela(dia, i, 'abre', e.target.value)}
                        className={CAMPO_HORA}
                      />
                      <span className="font-body text-sm text-ink-soft">até</span>
                      <input
                        type="time"
                        aria-label={`${DIAS_SEMANA[dia]}: fecha às`}
                        value={j.fecha}
                        onChange={(e) => alterarJanela(dia, i, 'fecha', e.target.value)}
                        className={CAMPO_HORA}
                      />
                      {d.janelas.length > 1 && (
                        <button
                          type="button"
                          aria-label="Remover intervalo"
                          onClick={() => removerJanela(dia, i)}
                          className={`${BTN_SECUNDARIO} px-3`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => adicionarJanela(dia)}
                    className="font-body text-xs text-ink-soft underline underline-offset-4 min-h-11"
                  >
                    + Adicionar intervalo
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Mensagem erro={erro} sucesso={sucesso} />

      <button onClick={salvar} disabled={salvando} className={`${BTN_PRIMARIO} w-full`}>
        {salvando ? 'Salvando…' : 'Salvar horários'}
      </button>
    </section>
  );
}

/* ========================================================================
   Dados da barbearia
   ======================================================================== */

function DadosBarbearia({
  barbeariaId,
  onNomeAlterado,
}: {
  barbeariaId: string;
  onNomeAlterado: (nome: string) => void;
}) {
  const [carregando, setCarregando] = useState(true);
  const [slug, setSlug] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    supabase
      .from('barbearias')
      .select('nome, slug, telefone, endereco')
      .eq('id', barbeariaId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setErro('Não foi possível carregar os dados da barbearia.');
        } else {
          setNome(data.nome ?? '');
          setSlug(data.slug ?? '');
          setTelefone(data.telefone ?? '');
          setEndereco(data.endereco ?? '');
        }
        setCarregando(false);
      });
  }, [barbeariaId]);

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    const nomeLimpo = nome.trim();
    const digitos = telefone.replace(/\D/g, '');

    if (nomeLimpo.length < 2 || nomeLimpo.length > 80) {
      setErro('Informe um nome com 2 a 80 caracteres.');
      return;
    }
    if (digitos.length > 0 && (digitos.length < 10 || digitos.length > 13)) {
      setErro('Informe o telefone com DDD, ou deixe em branco.');
      return;
    }
    if (endereco.trim().length > 150) {
      setErro('O endereço pode ter no máximo 150 caracteres.');
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from('barbearias')
      .update({
        nome: nomeLimpo,
        telefone: telefone.trim() || null,
        endereco: endereco.trim() || null,
      })
      .eq('id', barbeariaId)
      .select('id');

    setSalvando(false);

    if (error || !data || data.length === 0) {
      console.error('Erro ao salvar dados da barbearia:', error);
      setErro('Não foi possível salvar os dados.');
      return;
    }

    onNomeAlterado(nomeLimpo);
    setSucesso('Dados salvos.');
  }

  async function copiarLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro('Não foi possível copiar. Selecione o link e copie manualmente.');
    }
  }

  if (carregando) {
    return <p className="font-body text-ink-soft py-6 text-center">Carregando…</p>;
  }

  const link = slug ? `${window.location.origin}/b/${slug}` : '';

  return (
    <section className="space-y-6">
      {link && (
        <div className="bg-ink/5 border border-ink/10 p-4 space-y-2">
          <p className={ROTULO}>Link de agendamento dos clientes</p>
          <p className="font-body text-sm break-all">{link}</p>
          <button onClick={() => copiarLink(link)} className={BTN_SECUNDARIO}>
            {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
        </div>
      )}

      <form onSubmit={salvar} className="space-y-3">
        <div>
          <label htmlFor="barb-nome" className={ROTULO}>
            Nome da barbearia
          </label>
          <input
            id="barb-nome"
            className={CAMPO}
            value={nome}
            maxLength={80}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="barb-tel" className={ROTULO}>
            Telefone / WhatsApp da barbearia
          </label>
          <input
            id="barb-tel"
            className={CAMPO}
            type="tel"
            inputMode="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(21) 99999-0000"
          />
          <p className="font-body text-xs text-ink-soft mt-1">
            É o número que recebe a mensagem do botão &ldquo;Avisar a barbearia no WhatsApp&rdquo;,
            na confirmação do cliente.
          </p>
        </div>

        <div>
          <label htmlFor="barb-end" className={ROTULO}>
            Endereço
          </label>
          <input
            id="barb-end"
            className={CAMPO}
            value={endereco}
            maxLength={150}
            onChange={(e) => setEndereco(e.target.value)}
          />
        </div>

        <Mensagem erro={erro} sucesso={sucesso} />

        <button type="submit" disabled={salvando} className={`${BTN_PRIMARIO} w-full`}>
          {salvando ? 'Salvando…' : 'Salvar dados'}
        </button>
      </form>
    </section>
  );
}
