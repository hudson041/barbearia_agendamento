'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Barbearia = {
  id: string;
  nome: string;
  slug: string;
  endereco: string | null;
  telefone: string | null;
};

type Servico = {
  id: string;
  nome: string;
  duracao_min: number;
  preco_centavos: number;
};

type Barbeiro = {
  id: string;
  nome: string;
  especialidades: string[];
};

interface Props {
  barbearia: Barbearia;
  servicos: Servico[];
  barbeiros: Barbeiro[];
}

type Etapa = 'servico' | 'barbeiro' | 'horario' | 'dados' | 'confirmado';

function formatarPreco(centavos: number) {
  return (centavos / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

// Fuso da barbearia. Os horários livres vêm do banco como instantes absolutos
// (timestamptz) e são sempre exibidos neste fuso, não no do navegador do cliente.
const FUSO = 'America/Sao_Paulo';

function formatarHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: FUSO,
  });
}

// Monta o link do WhatsApp (wa.me) para falar com a barbearia.
// O número fica salvo na tabela "barbearias" em formato livre, então aqui
// guardamos só os dígitos e adicionamos o código do Brasil (55) se faltar.
function montarLinkWhatsApp(telefoneBarbearia: string | null, mensagem: string): string | null {
  if (!telefoneBarbearia) return null;

  let digitos = telefoneBarbearia.replace(/\D/g, '');
  if (digitos.length < 10) return null; // número incompleto: melhor não mostrar o botão

  // 10 ou 11 dígitos = DDD + número, sem código do país
  if (digitos.length <= 11) digitos = `55${digitos}`;

  return `https://wa.me/${digitos}?text=${encodeURIComponent(mensagem)}`;
}

export default function BookingFlow({ barbearia, servicos, barbeiros }: Props) {
  const [etapa, setEtapa] = useState<Etapa>('servico');
  const [servicoEscolhido, setServicoEscolhido] = useState<Servico | null>(null);
  const [barbeiroEscolhido, setBarbeiroEscolhido] = useState<Barbeiro | null>(null);
  const [dataEscolhida, setDataEscolhida] = useState<string>('');
  // Instante do horário escolhido (ISO), exatamente como o banco devolveu
  const [horarioEscolhido, setHorarioEscolhido] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [carregandoSlots, setCarregandoSlots] = useState(false);
  const [erroSlots, setErroSlots] = useState<string | null>(null);
  const [recarregarSlots, setRecarregarSlots] = useState(0);
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // "Hoje" no fuso da barbearia, em AAAA-MM-DD (en-CA já devolve nesse formato).
  // toISOString() usaria UTC e viraria "amanhã" a partir das 21h no Brasil.
  const dataMinima = useMemo(
    () => new Date().toLocaleDateString('en-CA', { timeZone: FUSO }),
    []
  );

  // Busca no banco só os horários livres para barbeiro + serviço + data.
  // A função devolve apenas horários, nunca dados de outros clientes.
  useEffect(() => {
    if (etapa !== 'horario' || !dataEscolhida || !barbeiroEscolhido || !servicoEscolhido) return;

    let ativo = true;
    setCarregandoSlots(true);
    setErroSlots(null);

    supabase
      .rpc('horarios_disponiveis', {
        p_slug: barbearia.slug,
        p_barbeiro_id: barbeiroEscolhido.id,
        p_servico_id: servicoEscolhido.id,
        p_data: dataEscolhida,
      })
      .then(({ data, error }) => {
        if (!ativo) return; // o cliente já mudou a data/barbeiro: descarta a resposta antiga
        if (error) {
          setSlots([]);
          setErroSlots('Não foi possível carregar os horários. Tente novamente.');
        } else {
          setSlots(((data ?? []) as { inicio: string }[]).map((r) => r.inicio));
        }
        setCarregandoSlots(false);
      });

    return () => {
      ativo = false;
    };
  }, [etapa, dataEscolhida, barbeiroEscolhido, servicoEscolhido, barbearia.slug, recarregarSlots]);

    // Link do WhatsApp, usado só na tela de confirmação
  const linkWhatsApp =
    etapa === 'confirmado' && servicoEscolhido && barbeiroEscolhido && dataEscolhida && horarioEscolhido
      ? montarLinkWhatsApp(
          barbearia.telefone,
          `Olá! Acabei de agendar ${servicoEscolhido.nome} com ${barbeiroEscolhido.nome} ` +
            `para o dia ${new Date(`${dataEscolhida}T00:00:00`).toLocaleDateString('pt-BR')} ` +
            `às ${formatarHora(horarioEscolhido)}. Meu nome é ${nome.trim()}.`
        )
      : null;

    async function confirmarAgendamento() {
    if (!servicoEscolhido || !barbeiroEscolhido || !dataEscolhida || !horarioEscolhido) return;
    if (!nome.trim() || telefone.replace(/\D/g, '').length < 10) {
      setErro('Preencha nome e telefone (com DDD) corretamente.');
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      const { error } = await supabase.rpc('criar_agendamento_publico', {
        p_slug: barbearia.slug,
        p_nome: nome.trim(),
        p_telefone: telefone.trim(),
        p_barbeiro_id: barbeiroEscolhido.id,
        p_servico_id: servicoEscolhido.id,
        p_data_hora: horarioEscolhido,
      });

      if (error) {
        if (error.code === '23505') {
          // Alguém reservou no meio tempo: volta para a escolha e atualiza a lista
          setHorarioEscolhido('');
          setEtapa('horario');
          setRecarregarSlots((n) => n + 1);
          throw new Error('Esse horário acabou de ser reservado por outra pessoa. Escolha outro.');
        }
        if (error.code === 'P0001') {
          throw new Error(error.message);
        }
        throw new Error('Não foi possível concluir o agendamento. Tente novamente.');
      }

      setEtapa('confirmado');
    } catch (e: any) {
      setErro(e.message ?? 'Não foi possível concluir o agendamento. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <header className="border-b border-ink/10 px-6 py-8">
        <p className="font-body text-xs tracking-wide text-ink-soft">Agendamento online</p>
        <h1 className="font-display text-4xl mt-1">{barbearia.nome}</h1>
        {barbearia.endereco && (
          <p className="font-body text-sm text-ink-soft mt-2">{barbearia.endereco}</p>
        )}
      </header>

      <div className="max-w-md mx-auto px-6 py-8">
        {/* Indicador simples de progresso, só quando ainda não confirmou */}
        {etapa !== 'confirmado' && (
          <ol className="flex gap-2 mb-8 font-body text-xs text-ink-soft">
            {['servico', 'barbeiro', 'horario', 'dados'].map((e, i) => (
              <li
                key={e}
                className={`flex-1 h-1 rounded-full ${
                  ['servico', 'barbeiro', 'horario', 'dados'].indexOf(etapa) >= i
                    ? 'bg-brass'
                    : 'bg-ink/10'
                }`}
              />
            ))}
          </ol>
        )}

        {/* ETAPA 1 — SERVIÇO, estilo "cardápio de barbearia" */}
        {etapa === 'servico' && (
          <section>
            <h2 className="font-display text-2xl mb-4">Escolha o serviço</h2>
            <ul className="divide-y divide-ink/10 border-y border-ink/10">
              {servicos.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => {
                      setServicoEscolhido(s);
                      setEtapa('barbeiro');
                    }}
                    className="w-full flex items-baseline justify-between py-4 text-left hover:bg-ink/5 transition-colors px-1"
                  >
                    <span className="font-body">
                      {s.nome}
                      <span className="text-ink-soft text-sm ml-2">{s.duracao_min} min</span>
                    </span>
                    <span className="font-display text-brass shrink-0 ml-4">
                      {formatarPreco(s.preco_centavos)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ETAPA 2 — BARBEIRO */}
        {etapa === 'barbeiro' && (
          <section>
            <button
              onClick={() => setEtapa('servico')}
              className="font-body text-sm text-ink-soft mb-4"
            >
              ← Voltar
            </button>
            <h2 className="font-display text-2xl mb-4">Escolha o profissional</h2>
            <div className="grid gap-3">
              {barbeiros.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setBarbeiroEscolhido(b);
                    setEtapa('horario');
                  }}
                  className="text-left border border-ink/15 rounded-none p-4 hover:border-brass transition-colors"
                >
                  <p className="font-body font-medium">{b.nome}</p>
                  {b.especialidades?.length > 0 && (
                    <p className="text-sm text-ink-soft mt-1">{b.especialidades.join(' · ')}</p>
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ETAPA 3 — DATA E HORÁRIO */}
        {etapa === 'horario' && (
          <section>
            <button
              onClick={() => setEtapa('barbeiro')}
              className="font-body text-sm text-ink-soft mb-4"
            >
              ← Voltar
            </button>
            <h2 className="font-display text-2xl mb-4">Escolha data e horário</h2>

            <label className="font-body text-sm text-ink-soft block mb-2">Data</label>
            <input
              type="date"
              min={dataMinima}
              value={dataEscolhida}
              onChange={(e) => {
                setDataEscolhida(e.target.value);
                setHorarioEscolhido('');
                setSlots([]);
              }}
              className="w-full border border-ink/20 px-3 py-2 font-body mb-6 bg-transparent"
            />

            {dataEscolhida && (
              <>
                <label className="font-body text-sm text-ink-soft block mb-2">Horário</label>

                {carregandoSlots ? (
                  <p className="font-body text-sm text-ink-soft py-4">Buscando horários livres…</p>
                ) : erroSlots ? (
                  <p role="alert" className="font-body text-sm text-burgundy py-2">
                    {erroSlots}
                  </p>
                ) : slots.length === 0 ? (
                  <p className="font-body text-sm text-ink-soft py-4">
                    Nenhum horário livre neste dia. Tente outra data ou outro profissional.
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((iso) => (
                      <button
                        key={iso}
                        onClick={() => setHorarioEscolhido(iso)}
                        className={`font-body text-sm py-2 min-h-11 border transition-colors ${
                          horarioEscolhido === iso
                            ? 'bg-ink text-paper border-ink'
                            : 'border-ink/20 hover:border-brass'
                        }`}
                      >
                        {formatarHora(iso)}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {horarioEscolhido && (
              <button
                onClick={() => setEtapa('dados')}
                className="w-full mt-6 bg-ink text-paper font-body py-3 hover:bg-ink/90 transition-colors"
              >
                Continuar
              </button>
            )}
          </section>
        )}

        {/* ETAPA 4 — DADOS DO CLIENTE */}
        {etapa === 'dados' && (
          <section>
            <button
              onClick={() => setEtapa('horario')}
              className="font-body text-sm text-ink-soft mb-4"
            >
              ← Voltar
            </button>
            <h2 className="font-display text-2xl mb-4">Seus dados</h2>

            <div className="bg-ink/5 border border-ink/10 p-4 mb-6 font-body text-sm">
              <p>{servicoEscolhido?.nome} — {barbeiroEscolhido?.nome}</p>
              <p className="text-ink-soft mt-1">
                {dataEscolhida && new Date(`${dataEscolhida}T00:00:00`).toLocaleDateString('pt-BR')}{' '}
                às {horarioEscolhido && formatarHora(horarioEscolhido)}
              </p>
            </div>

            <label className="font-body text-sm text-ink-soft block mb-2">Nome completo</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full border border-ink/20 px-3 py-2 font-body mb-4 bg-transparent"
              placeholder="Seu nome"
            />

            <label className="font-body text-sm text-ink-soft block mb-2">Telefone (WhatsApp)</label>
            <input
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full border border-ink/20 px-3 py-2 font-body mb-2 bg-transparent"
              placeholder="(21) 90000-0000"
            />

            {erro && <p className="text-sm text-burgundy font-body mt-2">{erro}</p>}

            <button
              onClick={confirmarAgendamento}
              disabled={enviando}
              className="w-full mt-6 bg-brass text-ink font-body py-3 hover:bg-brass/90 transition-colors disabled:opacity-50"
            >
              {enviando ? 'Confirmando...' : 'Confirmar agendamento'}
            </button>
          </section>
        )}

        {/* CONFIRMAÇÃO */}
        {etapa === 'confirmado' && (
          <section className="text-center py-12">
            <h2 className="font-display text-3xl mb-3">Agendamento confirmado</h2>
            <p className="font-body text-ink-soft">
              {servicoEscolhido?.nome} com {barbeiroEscolhido?.nome}
              <br />
              {dataEscolhida && new Date(`${dataEscolhida}T00:00:00`).toLocaleDateString('pt-BR')}{' '}
              às {horarioEscolhido && formatarHora(horarioEscolhido)}
            </p>
            <p className="font-body text-sm text-ink-soft mt-6">
              Guarde este horário. Em caso de imprevisto, entre em contato com{' '}
              {barbearia.nome}
              {barbearia.telefone ? ` pelo telefone ${barbearia.telefone}` : ''}.
            </p>
                        {linkWhatsApp && (
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-8 block w-full bg-ink text-paper font-body py-3 hover:bg-ink/90 transition-colors"
              >
                Avisar a barbearia no WhatsApp
              </a>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
