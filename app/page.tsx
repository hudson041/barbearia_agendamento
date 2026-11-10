import type { CSSProperties } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import ComMenuExemplos from './_components/ExemplosMenu';

const ETAPAS = [
  {
    titulo: 'Abra o link ou o QR code',
    texto: 'Ele leva direto à página da sua barbearia. Não precisa instalar aplicativo nem criar conta.',
  },
  {
    titulo: 'Escolha o serviço',
    texto: 'Veja a duração e o preço de cada serviço antes de decidir.',
  },
  {
    titulo: 'Escolha o profissional',
    texto: 'Selecione com quem você prefere ser atendido.',
  },
  {
    titulo: 'Escolha o dia e o horário',
    texto:
      'Aparecem só os horários livres, já levando em conta a duração do serviço. Se alguém pegar o mesmo horário antes de você, o sistema avisa na hora e você escolhe outro.',
  },
  {
    titulo: 'Informe seu nome e WhatsApp',
    texto: 'É só isso: sem senha e sem cadastro. O telefone é usado pela barbearia para falar com você, se precisar.',
  },
  {
    titulo: 'Pronto, é só aparecer',
    texto:
      'Você vê o resumo na tela, com serviço, profissional, dia e horário, e pode avisar a barbearia pelo WhatsApp com um toque. Para remarcar ou cancelar, fale com a barbearia.',
  },
];

// Direitos reservados do rodapé. O ano é o da primeira publicação (o que a convenção
// de copyright pede) e fica fixo: no Next.js 16, ler a data atual durante a
// pré-renderização da página gera erro.
const TITULAR = 'Hudson Marcos';
const ANO_PUBLICACAO = 2026;

// Define o atraso da animação de entrada de cada elemento
const atraso = (ms: number) => ({ '--delay': `${ms}ms` }) as CSSProperties;

export default function Home() {
  // Se este site é a "casa" de uma barbearia só (por exemplo, com o domínio próprio
  // dela), defina BARBEARIA_PADRAO_SLUG na Vercel e a raiz abre direto o agendamento.
  const slugPadrao = process.env.BARBEARIA_PADRAO_SLUG?.trim();
  if (slugPadrao) {
    redirect(`/b/${encodeURIComponent(slugPadrao)}`);
  }

  // Se definida, a abertura mostra o botão "Agendar um horário" para essa barbearia
  // (sem redirecionar: a página de apresentação continua visível).
  const slugAgendar = process.env.BARBEARIA_DESTAQUE_SLUG?.trim();

  // Conteúdo e rodapé usam o mesmo contêiner, então ficam na mesma margem esquerda.
  const conteiner = 'max-w-2xl mx-auto w-full px-6';

  return (
    <ComMenuExemplos>
      <div className="min-h-screen bg-paper text-ink flex flex-col">
        <main className="flex-1">
          {/* Abertura */}
          <section className="flex min-h-[85svh] items-center">
            <div className={`${conteiner} py-16 sm:py-24`}>
              <div className="grow-x h-1 w-12 bg-brass mb-6" />

              <p
                className="rise font-body text-lg sm:text-xl font-medium tracking-wide text-ink-soft"
                style={atraso(100)}
              >
                Agendamento online
              </p>

              <h1
                className="rise font-display mt-3 max-w-xl leading-tight text-balance text-[clamp(2.25rem,6vw,3.5rem)]"
                style={atraso(200)}
              >
                Seu horário na barbearia, sem fila e sem ligação.
              </h1>

              <p
                className="rise font-body text-lg text-ink-soft mt-5 max-w-lg text-pretty"
                style={atraso(320)}
              >
                Para agendar, abra o link ou o QR code que a sua barbearia divulgou. Lá você escolhe
                o serviço, o profissional e um horário livre em poucos toques.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
                {slugAgendar && (
                  <Link
                    href={`/b/${encodeURIComponent(slugAgendar)}`}
                    className="rise inline-flex min-h-11 items-center bg-ink px-6 font-body text-sm font-medium text-paper transition-colors hover:bg-ink/90"
                    style={atraso(440)}
                  >
                    Agendar um horário
                  </Link>
                )}

                <a
                  href="#como-funciona"
                  className="rise group inline-flex items-center gap-2 font-body text-sm font-medium border-b border-ink pb-1 transition-colors hover:text-brass hover:border-brass"
                  style={atraso(520)}
                >
                  Veja como funciona
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                </a>
              </div>
            </div>
          </section>

          {/* Passo a passo */}
          <section id="como-funciona" className="scroll-mt-8 border-t border-ink/10 py-16 sm:py-24">
            <div className={conteiner}>
              <h2 className="reveal font-display text-3xl sm:text-4xl leading-tight">
                Do link ao horário marcado, em menos de um minuto.
              </h2>
              <p className="reveal font-body text-ink-soft mt-3 max-w-lg">
                Cada etapa é uma tela simples, pensada para ser feita no celular, com uma mão só.
              </p>

              <ol className="relative mt-12 space-y-10 pl-14">
                {ETAPAS.map((etapa, i) => {
                  const ultima = i === ETAPAS.length - 1;
                  return (
                    <li key={etapa.titulo} className="reveal group relative">
                      {/* Trecho de linha até a próxima etapa: trilho fixo + linha dourada
                          que se desenha com a rolagem. A última etapa não tem trecho. */}
                      {!ultima && (
                        <span aria-hidden className="absolute -left-9 top-10 -bottom-10 w-px bg-ink/10">
                          <span className="timeline-line block h-full w-full bg-brass" />
                        </span>
                      )}

                      {ultima ? (
                        // Marco final: círculo preenchido com "check"
                        <span className="absolute -left-14 top-0 flex h-10 w-10 items-center justify-center rounded-full bg-brass text-paper ring-4 ring-brass/20">
                          <svg
                            aria-hidden
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M5 12.5l4.5 4.5L19 7.5" />
                          </svg>
                        </span>
                      ) : (
                        <span className="absolute -left-14 top-0 flex h-10 w-10 items-center justify-center rounded-full border border-brass bg-paper font-display text-lg text-brass transition-colors duration-300 group-hover:bg-brass group-hover:text-paper">
                          {i + 1}
                        </span>
                      )}

                      <h3 className="font-display text-2xl leading-snug transition-transform duration-300 group-hover:translate-x-1">
                        {etapa.titulo}
                      </h3>
                      <p className="font-body text-ink-soft mt-2 max-w-prose text-pretty">
                        {etapa.texto}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        </main>

        <footer className="border-t border-ink/10 py-5">
          <div
            className={`${conteiner} flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between`}
          >
            <Link
              href="/painel"
              className="font-body text-sm text-ink-soft underline underline-offset-4 transition-colors hover:text-ink"
            >
              Sou da barbearia: entrar no painel
            </Link>
            <p className="font-body text-sm text-ink-soft">
              © {ANO_PUBLICACAO} {TITULAR}. Todos os direitos reservados.
            </p>
          </div>
        </footer>
      </div>
    </ComMenuExemplos>
  );
}
