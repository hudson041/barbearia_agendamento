'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

/* ========================================================================
   Tipos
   ======================================================================== */

type Status =
  | 'aguardando'
  | 'confirmado'
  | 'em_atendimento'
  | 'concluido'
  | 'cancelado'
  | 'no_show';

type Perfil = {
  role: 'admin' | 'barbeiro' | 'cliente';
  nome: string;
  barbearia_id: string | null;
  barbearias: { nome: string; slug: string } | null;
};

type Barbeiro = { id: string; nome: string };

type Agendamento = {
  id: string;
  data_hora: string;
  duracao_min: number;
  status: Status;
  barbeiro_id: string;
  cliente: { nome: string; telefone: string } | null;
  barbeiro: { nome: string } | null;
  servico: { nome: string; preco_centavos: number } | null;
};

/* ========================================================================
   Constantes e helpers
   ======================================================================== */

const ROTULO_STATUS: Record<Status, string> = {
  aguardando: 'Aguardando',
  confirmado: 'Confirmado',
  em_atendimento: 'Em atendimento',
  concluido: 'Concluído',
  cancelado: 'Cancelado',
  no_show: 'Não compareceu',
};

// Faixa lateral de cada cartão: o status se reconhece de relance
const FAIXA_STATUS: Record<Status, string> = {
  aguardando: 'border-brass',
  confirmado: 'border-brass',
  em_atendimento: 'border-ink',
  concluido: 'border-moss',
  cancelado: 'border-burgundy/40',
  no_show: 'border-burgundy',
};

// Botões com no mínimo 44px de altura: confortáveis para tocar no celular
const BTN_BASE = 'min-h-11 px-4 font-body text-sm transition-colors disabled:opacity-50';
const BTN_PRIMARIO = `${BTN_BASE} bg-ink text-paper hover:bg-ink/90`;
const BTN_SECUNDARIO = `${BTN_BASE} border border-ink/30 hover:border-ink`;
const BTN_PERIGO = `${BTN_BASE} border border-burgundy/40 text-burgundy hover:border-burgundy`;

function formatarPreco(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatarTelefone(telefone: string) {
  const d = telefone.replace(/\D/g, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return telefone;
}

function inicioDoDia(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function adicionarDias(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function linkWhatsAppCliente(telefone: string, nomeCliente: string, nomeBarbearia: string, iso: string) {
  let d = telefone.replace(/\D/g, '');
  if (d.length < 10) return null;
  if (d.length <= 11) d = `55${d}`;

  const data = new Date(iso).toLocaleDateString('pt-BR');
  const mensagem =
    `Olá, ${nomeCliente.split(' ')[0]}! Aqui é da ${nomeBarbearia}, ` +
    `sobre o seu horário do dia ${data} às ${formatarHora(iso)}.`;

  return `https://wa.me/${d}?text=${encodeURIComponent(mensagem)}`;
}

/* ========================================================================
   Componente raiz: decide entre carregando, login e agenda
   ======================================================================== */

export default function Painel() {
  const [carregandoSessao, setCarregandoSessao] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setCarregandoSessao(false);
    });

    const { data: assinatura } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSession(novaSessao);
    });

    return () => assinatura.subscription.unsubscribe();
  }, []);

  if (carregandoSessao) return <TelaMensagem texto="Carregando…" />;
  if (!session) return <Login />;
  return <Agenda userId={session.user.id} />;
}

function TelaMensagem({ texto, children }: { texto: string; children?: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center gap-4 px-6">
      <p className="font-body text-ink-soft text-center">{texto}</p>
      {children}
    </main>
  );
}

/* ========================================================================
   Login
   ======================================================================== */

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function entrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });

    // Mensagem genérica de propósito: não revela se o e-mail existe ou não
    if (error) setErro('E-mail ou senha incorretos.');
    setEnviando(false);
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 px-6 py-8">
        <p className="font-body text-xs tracking-wide text-ink-soft">Área restrita</p>
        <h1 className="font-display text-4xl mt-1">Painel da barbearia</h1>
      </header>

      <form onSubmit={entrar} className="max-w-md mx-auto px-6 py-8">
        <label htmlFor="email" className="font-body text-sm text-ink-soft block mb-2">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-ink/20 px-3 py-2 min-h-11 font-body mb-4 bg-transparent"
        />

        <label htmlFor="senha" className="font-body text-sm text-ink-soft block mb-2">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          required
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full border border-ink/20 px-3 py-2 min-h-11 font-body mb-2 bg-transparent"
        />

        {erro && (
          <p role="alert" className="font-body text-sm text-burgundy mt-2">
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando} className={`${BTN_PRIMARIO} w-full mt-6`}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  );
}

/* ========================================================================
   Agenda do dia
   ======================================================================== */

function Agenda({ userId }: { userId: string }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [perfilCarregado, setPerfilCarregado] = useState(false);
  const [dia, setDia] = useState<Date>(() => inicioDoDia(new Date()));
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [filtroBarbeiro, setFiltroBarbeiro] = useState('todos');
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);
  const [novoAberto, setNovoAberto] = useState(false);

  // 1. Perfil do usuário logado (define a barbearia e o papel dele)
  useEffect(() => {
    let ativo = true;

    supabase
      .from('profiles')
      .select('role, nome, barbearia_id, barbearias(nome, slug)')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!ativo) return;
        setPerfil((data as unknown as Perfil) ?? null);
        setPerfilCarregado(true);
      });

    return () => {
      ativo = false;
    };
  }, [userId]);

  const barbeariaId = perfil?.barbearia_id ?? null;
  const temAcesso =
    !!perfil && !!barbeariaId && (perfil.role === 'admin' || perfil.role === 'barbeiro');

  // 2. Lista de barbeiros (para o filtro, quando houver mais de um)
  useEffect(() => {
    if (!barbeariaId) return;

    supabase
      .from('barbeiros')
      .select('id, nome')
      .eq('barbearia_id', barbeariaId)
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => setBarbeiros(data ?? []));
  }, [barbeariaId]);

  // 3. Agendamentos do dia escolhido
  const carregar = useCallback(async () => {
    if (!barbeariaId) return;

    const inicio = inicioDoDia(dia);
    const fim = adicionarDias(inicio, 1);

    const { data, error } = await supabase
      .from('agendamentos')
      .select(
        'id, data_hora, duracao_min, status, barbeiro_id, ' +
          'cliente:clientes(nome, telefone), ' +
          'barbeiro:barbeiros(nome), ' +
          'servico:servicos(nome, preco_centavos)'
      )
      .eq('barbearia_id', barbeariaId)
      .gte('data_hora', inicio.toISOString())
      .lt('data_hora', fim.toISOString())
      .order('data_hora', { ascending: true });

    if (error) {
      setErro('Não foi possível carregar a agenda.');
    } else {
      setErro(null);
      setAgendamentos((data as unknown as Agendamento[]) ?? []);
    }
    setCarregando(false);
  }, [barbeariaId, dia]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  // 4. Atualização automática: quando alguém agenda, o cartão aparece sozinho.
  //    O intervalo de 60s é uma rede de segurança caso o Realtime não esteja ativo.
  useEffect(() => {
    if (!barbeariaId) return;

    const canal = supabase
      .channel(`agenda-${barbeariaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'agendamentos',
          filter: `barbearia_id=eq.${barbeariaId}`,
        },
        () => {
          carregar();
        }
      )
      .subscribe();

    const intervalo = setInterval(carregar, 60_000);

    return () => {
      clearInterval(intervalo);
      supabase.removeChannel(canal);
    };
  }, [barbeariaId, carregar]);

  function irParaDia(novo: Date) {
    setCarregando(true);
    setDia(novo);
  }

  async function mudarStatus(id: string, novoStatus: Status, confirmacao?: string) {
    if (confirmacao && !window.confirm(confirmacao)) return;

    setAtualizandoId(id);
    setErro(null);

    const { data, error } = await supabase
      .from('agendamentos')
      .update({ status: novoStatus })
      .eq('id', id)
      .select('id');

    if (error) {
      // 23505: ao reabrir, o horário já foi ocupado por outro agendamento
      setErro(
        error.code === '23505'
          ? 'Não foi possível reabrir: esse horário já foi ocupado por outro agendamento.'
          : 'Não foi possível atualizar o agendamento. Tente novamente.'
      );
    } else if (!data || data.length === 0) {
      // Sem erro e sem linha alterada = a regra de segurança (RLS) barrou a alteração
      setErro('Você não tem permissão para alterar este agendamento.');
    }

    await carregar();
    setAtualizandoId(null);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  /* ---------- valores derivados ---------- */

  const visiveis = useMemo(
    () =>
      filtroBarbeiro === 'todos'
        ? agendamentos
        : agendamentos.filter((a) => a.barbeiro_id === filtroBarbeiro),
    [agendamentos, filtroBarbeiro]
  );

  const ativos = visiveis.filter((a) => a.status !== 'cancelado' && a.status !== 'no_show');
  const previsto = ativos.reduce((total, a) => total + (a.servico?.preco_centavos ?? 0), 0);
  const realizado = visiveis
    .filter((a) => a.status === 'concluido')
    .reduce((total, a) => total + (a.servico?.preco_centavos ?? 0), 0);

  const hoje = inicioDoDia(new Date());
  const ehHoje = dia.getTime() === hoje.getTime();
  const rotuloDia = dia.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // O "próximo" é o primeiro agendamento em aberto que ainda não terminou
  const agora = Date.now();
  const proximoId = ehHoje
    ? visiveis.find(
        (a) =>
          (a.status === 'aguardando' || a.status === 'confirmado') &&
          new Date(a.data_hora).getTime() + a.duracao_min * 60_000 > agora
      )?.id
    : undefined;

  /* ---------- telas de estado ---------- */

  if (!perfilCarregado) return <TelaMensagem texto="Carregando…" />;

  if (!temAcesso) {
    return (
      <TelaMensagem texto="Este usuário não tem acesso ao painel. Peça ao responsável para vincular seu perfil à barbearia.">
        <button onClick={sair} className={BTN_SECUNDARIO}>
          Sair
        </button>
      </TelaMensagem>
    );
  }

  const nomeBarbearia = perfil?.barbearias?.nome ?? 'Barbearia';

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="sticky top-0 z-10 border-b border-ink/10 bg-paper px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <div>
            <p className="font-body text-xs text-ink-soft">Painel</p>
            <h1 className="font-display text-2xl leading-tight">{nomeBarbearia}</h1>
          </div>
          <button
            onClick={sair}
            className="font-body text-sm text-ink-soft underline underline-offset-4 min-h-11 px-2"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        <button onClick={() => setNovoAberto(true)} className={`${BTN_PRIMARIO} w-full`}>
          + Novo agendamento
        </button>

        {/* Navegação entre dias */}
        <div className="flex items-center justify-between gap-2">
          <button
            aria-label="Dia anterior"
            onClick={() => irParaDia(adicionarDias(dia, -1))}
            className={`${BTN_SECUNDARIO} w-11 px-0`}
          >
            ←
          </button>

          <div className="text-center">
            <p className="font-display text-xl first-letter:uppercase">{rotuloDia}</p>
            {!ehHoje && (
              <button
                onClick={() => irParaDia(hoje)}
                className="font-body text-xs text-ink-soft underline underline-offset-4"
              >
                Voltar para hoje
              </button>
            )}
          </div>

          <button
            aria-label="Próximo dia"
            onClick={() => irParaDia(adicionarDias(dia, 1))}
            className={`${BTN_SECUNDARIO} w-11 px-0`}
          >
            →
          </button>
        </div>

        {/* Resumo do dia */}
        <dl className="grid grid-cols-3 border-y border-ink/10 divide-x divide-ink/10 text-center">
          <div className="py-3">
            <dt className="font-body text-xs text-ink-soft">Agendamentos</dt>
            <dd className="font-display text-xl">{ativos.length}</dd>
          </div>
          <div className="py-3">
            <dt className="font-body text-xs text-ink-soft">Previsto</dt>
            <dd className="font-display text-xl">{formatarPreco(previsto)}</dd>
          </div>
          <div className="py-3">
            <dt className="font-body text-xs text-ink-soft">Realizado</dt>
            <dd className="font-display text-xl">{formatarPreco(realizado)}</dd>
          </div>
        </dl>

        {/* Filtro por profissional: só aparece quando há mais de um */}
        {barbeiros.length > 1 && (
          <div>
            <label htmlFor="filtro-barbeiro" className="font-body text-xs text-ink-soft block mb-1">
              Profissional
            </label>
            <select
              id="filtro-barbeiro"
              value={filtroBarbeiro}
              onChange={(e) => setFiltroBarbeiro(e.target.value)}
              className="w-full border border-ink/20 bg-transparent px-3 py-2 min-h-11 font-body"
            >
              <option value="todos">Todos</option>
              {barbeiros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        {erro && (
          <p role="alert" className="font-body text-sm text-burgundy">
            {erro}
          </p>
        )}

        {/* Lista */}
        {carregando ? (
          <p className="font-body text-ink-soft py-8 text-center">Carregando agenda…</p>
        ) : visiveis.length === 0 ? (
          <p className="font-body text-ink-soft py-8 text-center">
            Nenhum agendamento neste dia.
          </p>
        ) : (
          <ul className="space-y-3">
            {visiveis.map((a) => {
              const emAberto = a.status === 'aguardando' || a.status === 'confirmado';
              const finalizado =
                a.status === 'concluido' || a.status === 'cancelado' || a.status === 'no_show';
              const ocupado = atualizandoId === a.id;
              const whatsapp = a.cliente
                ? linkWhatsAppCliente(a.cliente.telefone, a.cliente.nome, nomeBarbearia, a.data_hora)
                : null;

              return (
                <li
                  key={a.id}
                  className={`border-l-4 ${FAIXA_STATUS[a.status]} ${
                    a.status === 'concluido' ? 'bg-moss/10' : 'bg-ink/5'
                  } p-4`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-display text-2xl">{formatarHora(a.data_hora)}</p>
                    <p
                      className={`font-body text-xs ${
                        a.status === 'concluido' ? 'text-moss font-medium' : 'text-ink-soft'
                      }`}
                    >
                      {a.id === proximoId && (
                        <span className="text-brass font-medium mr-2">Próximo</span>
                      )}
                      {ROTULO_STATUS[a.status]}
                    </p>
                  </div>

                  <p className="font-body font-medium mt-1">{a.cliente?.nome ?? 'Cliente'}</p>
                  {a.cliente && (
                    <p className="font-body text-sm text-ink-soft">
                      {formatarTelefone(a.cliente.telefone)}
                    </p>
                  )}
                  <p className="font-body text-sm text-ink-soft mt-1">
                    {a.servico?.nome ?? 'Serviço'} · {a.duracao_min} min
                    {a.barbeiro ? ` · ${a.barbeiro.nome}` : ''}
                    {a.servico ? ` · ${formatarPreco(a.servico.preco_centavos)}` : ''}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {emAberto && (
                      <>
                        <button
                          disabled={ocupado}
                          onClick={() => mudarStatus(a.id, 'em_atendimento')}
                          className={BTN_PRIMARIO}
                        >
                          Iniciar atendimento
                        </button>
                        <button
                          disabled={ocupado}
                          onClick={() =>
                            mudarStatus(a.id, 'no_show', 'Marcar que o cliente não compareceu?')
                          }
                          className={BTN_PERIGO}
                        >
                          Não veio
                        </button>
                        <button
                          disabled={ocupado}
                          onClick={() =>
                            mudarStatus(a.id, 'cancelado', 'Cancelar este agendamento?')
                          }
                          className={BTN_PERIGO}
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {a.status === 'em_atendimento' && (
                      <>
                        <button
                          disabled={ocupado}
                          onClick={() => mudarStatus(a.id, 'concluido')}
                          className={BTN_PRIMARIO}
                        >
                          Concluir
                        </button>
                        <button
                          disabled={ocupado}
                          onClick={() => mudarStatus(a.id, 'aguardando')}
                          className={BTN_SECUNDARIO}
                        >
                          Desfazer
                        </button>
                      </>
                    )}

                    {finalizado && (
                      <button
                        disabled={ocupado}
                        onClick={() => mudarStatus(a.id, 'aguardando')}
                        className={BTN_SECUNDARIO}
                      >
                        Reabrir
                      </button>
                    )}

                    {whatsapp && (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${BTN_SECUNDARIO} inline-flex items-center`}
                      >
                        WhatsApp
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setCarregando(true);
              carregar();
            }}
            className="font-body text-xs text-ink-soft underline underline-offset-4 min-h-11"
          >
            Atualizar agora
          </button>
        </div>
      </div>

      {novoAberto && perfil?.barbearias && barbeariaId && (
        <NovoAgendamento
          barbeariaId={barbeariaId}
          barbeariaSlug={perfil.barbearias.slug}
          barbeiros={barbeiros}
          diaInicial={dia}
          onClose={() => setNovoAberto(false)}
          onCriado={(dataISO) => {
            setNovoAberto(false);
            // Leva a agenda para o dia que acabou de receber o agendamento
            irParaDia(inicioDoDia(new Date(`${dataISO}T00:00:00`)));
          }}
        />
      )}
    </main>
  );
}

/* ========================================================================
   Novo agendamento (balcão / telefone)
   ======================================================================== */

type Servico = { id: string; nome: string; duracao_min: number; preco_centavos: number };

// AAAA-MM-DD no fuso do navegador (toISOString usaria UTC e erraria o dia à noite)
function dataLocalISO(d: Date) {
  return d.toLocaleDateString('en-CA');
}

const CAMPO = 'w-full border border-ink/20 bg-transparent px-3 py-2 min-h-11 font-body';

function NovoAgendamento({
  barbeariaId,
  barbeariaSlug,
  barbeiros,
  diaInicial,
  onClose,
  onCriado,
}: {
  barbeariaId: string;
  barbeariaSlug: string;
  barbeiros: Barbeiro[];
  diaInicial: Date;
  onClose: () => void;
  onCriado: (dataISO: string) => void;
}) {
  const hojeISO = dataLocalISO(new Date());
  const diaInicialISO = dataLocalISO(diaInicial);

  const [servicos, setServicos] = useState<Servico[]>([]);
  const [servicoId, setServicoId] = useState('');
  const [barbeiroId, setBarbeiroId] = useState('');
  const [data, setData] = useState(diaInicialISO < hojeISO ? hojeISO : diaInicialISO);
  const [horario, setHorario] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [erroSlots, setErroSlots] = useState<string | null>(null);
  const [recarregar, setRecarregar] = useState(0);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Com um único profissional, não há o que escolher
  const barbeiroEfetivo = barbeiroId || (barbeiros.length === 1 ? barbeiros[0].id : '');

  useEffect(() => {
    supabase
      .from('servicos')
      .select('id, nome, duracao_min, preco_centavos')
      .eq('barbearia_id', barbeariaId)
      .eq('ativo', true)
      .order('nome')
      .then(({ data: lista }) => setServicos(lista ?? []));
  }, [barbeariaId]);

  // Mesmos horários livres da página pública (mesma função do banco)
  useEffect(() => {
    if (!servicoId || !barbeiroEfetivo || !data) return;

    let ativo = true;
    setCarregandoSlots(true);
    setErroSlots(null);

    supabase
      .rpc('horarios_disponiveis', {
        p_slug: barbeariaSlug,
        p_barbeiro_id: barbeiroEfetivo,
        p_servico_id: servicoId,
        p_data: data,
      })
      .then(({ data: linhas, error }) => {
        if (!ativo) return;
        if (error) {
          setSlots([]);
          setErroSlots('Não foi possível carregar os horários.');
        } else {
          setSlots(((linhas ?? []) as { inicio: string }[]).map((r) => r.inicio));
        }
        setCarregandoSlots(false);
      });

    return () => {
      ativo = false;
    };
  }, [servicoId, barbeiroEfetivo, data, barbeariaSlug, recarregar]);

  function limparHorario() {
    setHorario('');
    setSlots([]);
  }

  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!servicoId || !barbeiroEfetivo || !horario) {
      setErro('Escolha serviço, profissional e horário.');
      return;
    }
    if (nome.trim().length < 2 || telefone.replace(/\D/g, '').length < 10) {
      setErro('Preencha nome e telefone (com DDD) corretamente.');
      return;
    }

    setEnviando(true);
    setErro(null);

    const { error } = await supabase.rpc('criar_agendamento_manual', {
      p_nome: nome.trim(),
      p_telefone: telefone.trim(),
      p_barbeiro_id: barbeiroEfetivo,
      p_servico_id: servicoId,
      p_data_hora: horario,
    });

    setEnviando(false);

    if (error) {
      if (error.code === '23505') {
        setErro('Esse horário acabou de ser ocupado. Escolha outro.');
        setHorario('');
        setRecarregar((n) => n + 1);
      } else if (error.code === 'P0001') {
        setErro(error.message);
      } else {
        setErro('Não foi possível criar o agendamento. Tente novamente.');
      }
      return;
    }

    onCriado(data);
  }

  return (
    <div className="fixed inset-0 z-20 overflow-y-auto bg-ink/40">
      <form onSubmit={salvar} className="min-h-full max-w-md mx-auto bg-paper px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Novo agendamento</h2>
          <button
            type="button"
            onClick={onClose}
            className="font-body text-sm text-ink-soft underline underline-offset-4 min-h-11 px-2"
          >
            Fechar
          </button>
        </div>

        <div>
          <label htmlFor="na-servico" className="font-body text-xs text-ink-soft block mb-1">
            Serviço
          </label>
          <select
            id="na-servico"
            value={servicoId}
            onChange={(e) => {
              setServicoId(e.target.value);
              limparHorario();
            }}
            className={CAMPO}
          >
            <option value="">Selecione…</option>
            {servicos.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome} · {s.duracao_min} min · {formatarPreco(s.preco_centavos)}
              </option>
            ))}
          </select>
        </div>

        {barbeiros.length > 1 && (
          <div>
            <label htmlFor="na-barbeiro" className="font-body text-xs text-ink-soft block mb-1">
              Profissional
            </label>
            <select
              id="na-barbeiro"
              value={barbeiroId}
              onChange={(e) => {
                setBarbeiroId(e.target.value);
                limparHorario();
              }}
              className={CAMPO}
            >
              <option value="">Selecione…</option>
              {barbeiros.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="na-data" className="font-body text-xs text-ink-soft block mb-1">
            Data
          </label>
          <input
            id="na-data"
            type="date"
            min={hojeISO}
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              limparHorario();
            }}
            className={CAMPO}
          />
        </div>

        {servicoId && barbeiroEfetivo && data && (
          <div>
            <p className="font-body text-xs text-ink-soft mb-1">Horário</p>
            {carregandoSlots ? (
              <p className="font-body text-sm text-ink-soft py-2">Buscando horários livres…</p>
            ) : erroSlots ? (
              <p role="alert" className="font-body text-sm text-burgundy py-2">
                {erroSlots}
              </p>
            ) : slots.length === 0 ? (
              <p className="font-body text-sm text-ink-soft py-2">
                Nenhum horário livre neste dia para este profissional.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2">
                {slots.map((iso) => (
                  <button
                    type="button"
                    key={iso}
                    onClick={() => setHorario(iso)}
                    className={`font-body text-sm min-h-11 border transition-colors ${
                      horario === iso
                        ? 'bg-ink text-paper border-ink'
                        : 'border-ink/20 hover:border-brass'
                    }`}
                  >
                    {formatarHora(iso)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <label htmlFor="na-nome" className="font-body text-xs text-ink-soft block mb-1">
            Nome do cliente
          </label>
          <input
            id="na-nome"
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={CAMPO}
          />
        </div>

        <div>
          <label htmlFor="na-telefone" className="font-body text-xs text-ink-soft block mb-1">
            Telefone (WhatsApp)
          </label>
          <input
            id="na-telefone"
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(21) 90000-0000"
            className={CAMPO}
          />
        </div>

        {erro && (
          <p role="alert" className="font-body text-sm text-burgundy">
            {erro}
          </p>
        )}

        <button type="submit" disabled={enviando} className={`${BTN_PRIMARIO} w-full`}>
          {enviando ? 'Salvando…' : 'Agendar'}
        </button>
      </form>
    </div>
  );
}
