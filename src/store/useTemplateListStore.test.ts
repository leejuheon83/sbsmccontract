import { describe, expect, it, vi } from 'vitest';

describe('useTemplateListStore (cloud-only templates)', () => {
  it('Supabase 미설정이면 hydrate가 로컬을 쓰지 않고 빈 목록으로 고정된다', async () => {
    vi.resetModules();
    const fetchSpy = vi.fn();
    vi.doMock('../lib/supabase/client', () => ({
      isSupabaseConfigured: () => false,
    }));
    vi.doMock('../lib/supabase/managedTemplateCatalogDb', () => ({
      fetchManagedTemplateCatalog: fetchSpy,
    }));

    const { hydrateManagedTemplateList, useTemplateListStore } = await import(
      './useTemplateListStore'
    );
    useTemplateListStore.setState({ items: [{ id: 'x' } as any] });

    await hydrateManagedTemplateList();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(useTemplateListStore.getState().items).toEqual([]);
  });

  it('Supabase 설정이면 hydrate가 클라우드 목록만 사용한다 (null이면 빈 배열)', async () => {
    vi.resetModules();
    const fetchSpy = vi.fn().mockResolvedValue(null);
    vi.doMock('../lib/supabase/client', () => ({
      isSupabaseConfigured: () => true,
    }));
    vi.doMock('../lib/supabase/managedTemplateCatalogDb', () => ({
      fetchManagedTemplateCatalog: fetchSpy,
    }));

    const { hydrateManagedTemplateList, useTemplateListStore } = await import(
      './useTemplateListStore'
    );

    await hydrateManagedTemplateList();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(useTemplateListStore.getState().items).toEqual([]);
  });

  it('Supabase 미설정이면 add/update/discard/remove/sync가 상태를 변경하지 않는다', async () => {
    vi.resetModules();
    vi.doMock('../lib/supabase/client', () => ({
      isSupabaseConfigured: () => false,
    }));
    vi.doMock('../lib/supabase/managedTemplateCatalogDb', () => ({
      fetchManagedTemplateCatalog: vi.fn(),
    }));

    const { useTemplateListStore } = await import('./useTemplateListStore');
    const before = useTemplateListStore.getState().items;

    useTemplateListStore.getState().addItem({ id: 'a' } as any);
    useTemplateListStore.getState().updateItem('a', { name: 'x' } as any);
    useTemplateListStore.getState().discardItem('a');
    useTemplateListStore.getState().removeItem('a');
    useTemplateListStore.getState().syncFromEditor('a', [] as any, 'v1');

    expect(useTemplateListStore.getState().items).toBe(before);
  });
});

