import type { Metadata } from 'next';
import Painel from './Painel';

// Área restrita: não deve aparecer em buscadores
export const metadata: Metadata = {
  title: 'Painel',
  robots: { index: false, follow: false },
};

export default function PainelPage() {
  return <Painel />;
}