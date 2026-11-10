'use client';

import { useEffect, useState, type ReactNode } from 'react';

type Exemplo = {
  id: string;
  tipo: string;
  nome: string;
  descricao: string;
  profissionais: string[];
  servicos: { nome: string; min: number; preco: string }[];
};

// Exemplos fictícios, só para ilustrar como diferentes negócios usam o agendamento.
const EXEMPLOS: Exemplo[] = [
  {
    id: 'barbearia-equipe',
    tipo: 'Barbearia com equipe',
    nome: 'Barbearia Navalha de Ouro',
    descricao: 'Três barbeiros, cada um com a própria agenda. O cliente escolhe com quem cortar.',
    profissionais: ['Rafael', 'Diego', 'Marcos'],
    servicos: [
      { nome: 'Corte', min: 40, preco: 'R$ 45' },
      { nome: 'Barba', min: 30, preco: 'R$ 35' },
      { nome: 'Corte + barba', min: 60, preco: 'R$ 70' },
      { nome: 'Sobrancelha', min: 15, preco: 'R$ 15' },
    ],
  },
  {
    id: 'salao',
    tipo: 'Salão de beleza',
    nome: 'Studio Bela Fio',
    descricao: 'Serviços longos, como coloração, ocupam o tempo certo na agenda da profissional.',
    profissionais: ['Camila', 'Juliana', 'Patrícia'],
    servicos: [
      { nome: 'Corte feminino', min: 60, preco: 'R$ 90' },
      { nome: 'Escova', min: 45, preco: 'R$ 60' },
      { nome: 'Hidratação', min: 60, preco: 'R$ 80' },
      { nome: 'Coloração', min: 120, preco: 'R$ 180' },
    ],
  },
  {
    id: 'barbearia-solo',
    tipo: 'Barbeiro autônomo',
    nome: 'Barbearia do Seu Antônio',
    descricao: 'O dono atende sozinho e acompanha a agenda do dia direto no celular.',
    profissionais: ['Antônio'],
    servicos: [
      { nome: 'Corte', min: 30, preco: 'R$ 35' },
      { nome: 'Barba', min: 30, preco: 'R$ 30' },
      { nome: 'Corte + barba', min: 50, preco: 'R$ 55' },
    ],
  },
];

const CHAVE_RECOLHIDO = 'menu-exemplos-recolhido';

// Envolve a página: desenha o menu lateral e reserva o espaço dele ao lado do conteúdo.
export default function ComMenuExemplos({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false); // gaveta, só no celular
  const [recolhido, setRecolhido] = useState(false); // barra estreita, só no computador
  const [ativo, setAtivo] = useState<string>(EXEMPLOS[0].id); // exemplo expandido

  // Lembra se o menu estava recolhido (lido depois da montagem, para não divergir do servidor)
  useEffect(() => {
    try {
      if (localStorage.getItem(CHAVE_RECOLHIDO) === '1') setRecolhido(true);
    } catch {
      /* armazenamento indisponível: segue com o menu aberto */
    }
  }, []);

  function definirRecolhido(valor: boolean) {
    setRecolhido(valor);
    try {
      localStorage.setItem(CHAVE_RECOLHIDO, valor ? '1' : '0');
    } catch {
      /* ignora */
    }
  }

  // Com a gaveta aberta: Esc fecha e a página de trás não rola
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAberto(false);
    };
    document.addEventListener('keydown', aoTeclar);
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowAnterior;
    };
  }, [aberto]);

  return (
    <div
      className={`bg-paper transition-[padding-left] duration-300 ease-out motion-reduce:transition-none ${
        recolhido ? 'lg:pl-16' : 'lg:pl-72'
      }`}
    >
      {/* Botão que abre o menu no celular */}
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-expanded={aberto}
        aria-controls="menu-exemplos"
        className="fixed left-4 top-4 z-30 inline-flex min-h-11 items-center gap-2 border border-ink/15 bg-paper/95 px-3 font-body text-sm shadow-sm backdrop-blur lg:hidden"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
        Exemplos de uso
      </button>

      {/* Fundo escurecido atrás da gaveta (celular) */}
      <div
        aria-hidden
        onClick={() => setAberto(false)}
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity duration-300 motion-reduce:transition-none lg:hidden ${
          aberto ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="menu-exemplos"
        aria-label="Exemplos de uso"
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] overflow-x-hidden overflow-y-auto border-r border-ink/10 bg-paper transition-[transform,visibility,width] duration-300 ease-out motion-reduce:transition-none lg:visible lg:z-10 lg:max-w-none lg:translate-x-0 ${
          recolhido ? 'lg:w-16' : 'lg:w-72'
        } ${aberto ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        {/* Barra estreita (computador, menu recolhido): um ícone por exemplo */}
        {recolhido && (
          <div className="hidden flex-col items-center gap-2 px-2 py-4 lg:flex">
            <button
              type="button"
              onClick={() => definirRecolhido(false)}
              aria-label="Expandir menu"
              title="Expandir menu"
              className="flex h-11 w-11 items-center justify-center text-ink-soft transition-colors hover:text-ink"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16M4 12h16M4 19h16" />
              </svg>
            </button>
            <div className="my-1 h-px w-8 bg-ink/10" />
            {EXEMPLOS.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  setAtivo(ex.id);
                  definirRecolhido(false);
                }}
                aria-label={`${ex.nome}: abrir exemplo`}
                title={ex.nome}
                className={`flex h-11 w-11 items-center justify-center rounded-full border font-display text-lg transition-colors hover:border-brass hover:text-brass ${
                  ex.id === ativo ? 'border-brass text-brass' : 'border-ink/15 text-ink-soft'
                }`}
              >
                {ex.nome.replace(/^Barbearia (do |de |da )?/, '').charAt(0)}
              </button>
            ))}
          </div>
        )}

        {/* Menu completo (sempre no celular; no computador quando não recolhido) */}
        <div className={`px-5 py-6 ${recolhido ? 'lg:hidden' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-4 h-1 w-8 bg-brass" />
            <h2 className="font-display text-2xl leading-tight">Exemplos de uso</h2>
            <p className="mt-2 font-body text-sm text-ink-soft text-pretty">
              Veja como diferentes negócios usam o agendamento.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="-mr-2 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center text-ink-soft hover:text-ink lg:hidden"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => definirRecolhido(true)}
            aria-label="Recolher menu"
            title="Recolher menu"
            className="-mr-2 -mt-1 hidden h-11 w-11 shrink-0 items-center justify-center text-ink-soft transition-colors hover:text-ink lg:flex"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>

        <ul className="mt-6 space-y-2">
          {EXEMPLOS.map((ex) => {
            const expandido = ex.id === ativo;
            return (
              <li
                key={ex.id}
                className={`border transition-colors duration-300 ${
                  expandido ? 'border-brass/60 bg-ink/[0.03]' : 'border-ink/10'
                }`}
              >
                <button
                  type="button"
                  aria-expanded={expandido}
                  aria-controls={`exemplo-${ex.id}`}
                  onClick={() => setAtivo(expandido ? '' : ex.id)}
                  className="flex min-h-11 w-full items-start justify-between gap-3 px-3 py-3 text-left"
                >
                  <span>
                    <span className="block font-body text-[11px] uppercase tracking-wider text-ink-soft">
                      {ex.tipo}
                    </span>
                    <span className="mt-0.5 block font-display text-lg leading-snug">{ex.nome}</span>
                  </span>
                  <svg
                    aria-hidden
                    viewBox="0 0 24 24"
                    className={`mt-2 h-4 w-4 shrink-0 text-ink-soft transition-transform duration-300 ${
                      expandido ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Abre e fecha animando a altura */}
                <div
                  id={`exemplo-${ex.id}`}
                  className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                    expandido ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden" inert={!expandido}>
                    <div className="px-3 pb-4">
                      <p className="font-body text-sm text-ink-soft text-pretty">{ex.descricao}</p>

                      <p className="mt-4 font-body text-[11px] uppercase tracking-wider text-ink-soft">
                        {ex.profissionais.length > 1 ? 'Profissionais' : 'Profissional'}
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-2">
                        {ex.profissionais.map((p) => (
                          <li
                            key={p}
                            className="border border-ink/15 px-2.5 py-1 font-body text-sm"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>

                      <p className="mt-4 font-body text-[11px] uppercase tracking-wider text-ink-soft">
                        Serviços
                      </p>
                      <ul className="mt-2 divide-y divide-ink/10 border-y border-ink/10">
                        {ex.servicos.map((s) => (
                          <li key={s.nome} className="flex items-baseline justify-between gap-3 py-2">
                            <span className="font-body text-sm">
                              {s.nome}
                              <span className="ml-1.5 text-xs text-ink-soft">{s.min} min</span>
                            </span>
                            <span className="shrink-0 font-display text-brass">{s.preco}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 font-body text-xs text-ink-soft text-pretty">
          Exemplos fictícios, só para ilustrar. Cada negócio define os próprios serviços,
          profissionais, preços e horários.
        </p>
        </div>
      </aside>

      {children}
    </div>
  );
}
