import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Returns true when Vite env has both URL and anon key (trimmed non-empty).
 * Use this to branch UI: e.g. "클라우드 동기화" vs 로컬만.
 */
export function isSupabaseConfigured(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}

/**
 * Singleton browser client for SPA. Call only after confirming
 * `isSupabaseConfigured()` or when you intend to throw if misconfigured.
 *
 * Types: run `npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts`
 * then `createClient<Database>(...)` if you want typed queries.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;

  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    throw new Error(
      'Supabase 환경 변수가 없습니다. .env.local에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정하세요. (.env.example 참고)',
    );
  }

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
