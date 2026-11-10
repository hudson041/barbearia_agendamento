import Link from 'next/link';

// Aparece para qualquer endereço que não existe, inclusive um link de barbearia
// digitado errado (/b/slug-que-nao-existe).
export default function NotFound() {
  return (
    <main className="min-h-screen bg-paper text-ink flex items-center">
      <div className="mx-auto w-full max-w-md px-6 py-16">
        <div className="h-1 w-12 bg-brass mb-6" />
        <p className="font-body text-xs tracking-wide text-ink-soft">Erro 404</p>
        <h1 className="font-display text-4xl leading-tight mt-2">
          Não encontramos esta página.
        </h1>
        <p className="font-body text-ink-soft mt-4">
          O endereço pode estar incorreto, ou a barbearia mudou o link. Confira o link ou o QR
          code que você recebeu.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center bg-ink px-6 font-body text-sm font-medium text-paper transition-colors hover:bg-ink/90"
        >
          Ir para o início
        </Link>
      </div>
    </main>
  );
}
