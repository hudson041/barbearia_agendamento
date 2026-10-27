import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltam NEXT_PUBLIC_SUPABASE_URL e/ou NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local'
  );
}

// Client único, reaproveitado em toda a aplicação (evita reconexões desnecessárias)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
