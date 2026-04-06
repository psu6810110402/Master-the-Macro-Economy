import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy';

if (supabaseUrl === 'https://dummy.supabase.co') {
  console.warn('Supabase URL or Anon Key is missing from environment variables. Using dummy values for build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
