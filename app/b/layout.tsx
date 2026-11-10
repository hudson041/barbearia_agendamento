import Link from 'next/link';
import type { ReactNode } from 'react';

// Envolve todas as páginas de barbearia (/b/...): acrescenta um rodapé com
// os caminhos de volta, sem mexer no fluxo de agendamento em si.
export default function BarbeariaLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}

      <footer className="border-t border-ink/10 bg-paper px-6 py-4">
        <div className="mx-auto flex max-w-md flex-wrap items-center justify-between gap-x-6">
          <Link
            href="/"
            className="font-body text-sm text-ink-soft underline underline-offset-4 min-h-11 inline-flex items-center"
          >
            Início
          </Link>
          <Link
            href="/painel"
            className="font-body text-sm text-ink-soft underline underline-offset-4 min-h-11 inline-flex items-center"
          >
            Sou da barbearia
          </Link>
        </div>
      </footer>
    </>
  );
}
