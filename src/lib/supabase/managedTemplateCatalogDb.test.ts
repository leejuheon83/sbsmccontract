import { describe, expect, it, vi } from 'vitest';

describe('fetchManagedTemplateCatalog', () => {
  it('Supabase 미설정이면 null을 반환한다', async () => {
    vi.resetModules();
    vi.doMock('./client', () => ({
      isSupabaseConfigured: () => false,
      getSupabaseBrowserClient: () => {
        throw new Error('should not be called');
      },
    }));
    const { fetchManagedTemplateCatalog } = await import(
      './managedTemplateCatalogDb'
    );
    await expect(fetchManagedTemplateCatalog()).resolves.toBeNull();
  });
});
