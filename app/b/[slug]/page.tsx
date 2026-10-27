import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import BookingFlow from './BookingFlow';

export const instant = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Server Component: busca os dados públicos da barbearia antes de renderizar.
// Como as tabelas têm policy de "leitura pública", isso funciona mesmo sem
// usuário logado — é a página que o cliente final vai acessar pelo link.
// Nota: a partir do Next.js 15+, "params" chega como uma Promise e precisa
// ser aguardado antes de usar suas propriedades.
export default async function BarbeariaPage({ params }: PageProps) {
  const { slug } = await params;

  const { data: barbearia, error: barbeariaError } = await supabase
    .from('barbearias')
    .select('id, nome, slug, endereco, telefone, status')
    .eq('slug', slug)
    .single();

  if (barbeariaError || !barbearia) {
    notFound();
  }

  if (barbearia.status === 'cancelado' || barbearia.status === 'suspenso') {
    return (
      <main className="min-h-screen bg-paper flex items-center justify-center px-6">
        <p className="text-ink-soft font-body text-center max-w-sm">
          Esta barbearia não está aceitando agendamentos no momento.
        </p>
      </main>
    );
  }

  const [{ data: servicos }, { data: barbeiros }] = await Promise.all([
    supabase
      .from('servicos')
      .select('id, nome, duracao_min, preco_centavos')
      .eq('barbearia_id', barbearia.id)
      .eq('ativo', true)
      .order('preco_centavos', { ascending: true }),
    supabase
      .from('barbeiros')
      .select('id, nome, especialidades')
      .eq('barbearia_id', barbearia.id)
      .eq('ativo', true),
  ]);

  return (
    <BookingFlow
      barbearia={barbearia}
      servicos={servicos ?? []}
      barbeiros={barbeiros ?? []}
    />
  );
}
