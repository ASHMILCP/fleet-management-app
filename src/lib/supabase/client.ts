import { createBrowserClient } from '@supabase/ssr';

const DEFAULT_SUPABASE_URL = 'https://fxtjhnpdiheosuvfargg.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_S-fybHl9ZAnFlzy78y-LCg_vspiZP4K';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;

  return createBrowserClient(supabaseUrl, supabaseKey);
}

export function isLiveSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_KEY;
  return Boolean(
    supabaseUrl &&
    !supabaseUrl.includes('sample-fleet-app') &&
    !supabaseUrl.includes('your-project-id') &&
    supabaseKey &&
    !supabaseKey.includes('dummy-anon-key')
  );
}
