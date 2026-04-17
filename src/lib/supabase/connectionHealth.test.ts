import { describe, expect, it, vi } from 'vitest';

describe('checkSupabaseAppUsersReachable', () => {
  it('Supabase 미설정이면 mode off', async () => {
    vi.resetModules();
    vi.doMock('./client', () => ({
      isSupabaseConfigured: () => false,
      getSupabaseBrowserClient: () => {
        throw new Error('no');
      },
    }));
    const { checkSupabaseAppUsersReachable } = await import('./connectionHealth');
    await expect(checkSupabaseAppUsersReachable()).resolves.toEqual({
      mode: 'off',
    });
  });
});
