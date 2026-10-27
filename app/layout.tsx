import type { Metadata } from 'next';
import { Fraunces, Work_Sans } from 'next/font/google';
import './globals.css';

// Nota: as variáveis aqui usam sufixo "-raw" de propósito. O Tailwind v4
// gera automaticamente uma classe "font-display" a partir de uma variável
// chamada "--font-display" dentro do @theme (globals.css) — se o next/font
// também exportasse uma variável com esse mesmo nome, uma referenciaria a
// si mesma. Por isso: next/font usa "-raw", e o @theme mapeia
// --font-display -> var(--font-display-raw).
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-display-raw',
  weight: ['500', '600'],
});

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-body-raw',
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Agendamento',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${fraunces.variable} ${workSans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
