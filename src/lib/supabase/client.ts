import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createBrowserClient(supabaseUrl, supabaseKey);
}

export function isLiveSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return Boolean(
    supabaseUrl &&
    !supabaseUrl.includes('sample-fleet-app') &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseKey &&
    !supabaseKey.includes('dummy-anon-key')
  );
}
