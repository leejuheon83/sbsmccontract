import { getSupabaseBrowserClient, isSupabaseConfigured } from './client';

export type SupabaseConnectionStatus =
  | { mode: 'off' }
  | { mode: 'ok' }
  | { mode: 'error'; message: string };

/**
 * 브라우저에서 URL·anon 키가 유효한지, `app_users` 테이블이 있는지 확인합니다.
 * (로그인·사용자 관리에 필요한 최소 스키마)
 */
export async function checkSupabaseAppUsersReachable(): Promise<SupabaseConnectionStatus> {
  if (!isSupabaseConfigured()) return { mode: 'off' };
  try {
    const sb = getSupabaseBrowserClient();
    const { error } = await sb.from('app_users').select('id').limit(1);
    if (error) {
      return {
        mode: 'error',
        message: error.message,
      };
    }
    return { mode: 'ok' };
  } catch (e) {
    return { mode: 'error', message: String(e) };
  }
}
