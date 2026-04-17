// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 정책: 편집기의 "버전 저장"(saveVersion)은 **계약 초안에만** 반영하고
 * 템플릿 관리의 원본(ver / clauses / file)을 절대 변경하지 않는다.
 *
 * 과거에는 `editorOrigin === 'managed'`일 때 `useTemplateListStore.syncFromEditor`를
 * 호출해 원본 템플릿의 ver·clauses를 덮어썼으나, 이 동작은 Word 내보내기 서식
 * 불일치·원본 문서 훼손을 유발했으므로 제거되었다.
 */
describe('useAppStore.saveVersion', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('managed origin 편집기에서 저장해도 원본 템플릿의 ver/clauses는 바뀌지 않는다', async () => {
    vi.doMock('../lib/supabase/client', () => ({
      isSupabaseConfigured: () => true,
    }));
    vi.doMock('../lib/supabase/managedTemplateCatalogDb', () => ({
      fetchManagedTemplateCatalog: vi.fn(),
      pushManagedTemplateCatalog: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../lib/authSession', () => ({
      loadAuthSession: () => null,
      saveAuthSession: vi.fn(),
      clearAuthSession: vi.fn(),
    }));

    const { useAppStore } = await import('./useAppStore');
    const { useTemplateListStore } = await import('./useTemplateListStore');

    const originalTemplate = {
      id: 'tpl-123',
      name: '원본 템플릿',
      ver: 'v1.0',
      status: 'active',
      tone: 'primary',
      clauseCount: 1,
      clauses: [
        {
          num: '§1',
          title: '원본 조항',
          state: 'approved',
          bodyFormat: 'html',
          body: '<p>원본 본문</p>',
        },
      ],
    } as any;

    useTemplateListStore.setState({ items: [originalTemplate] });

    useAppStore.setState({
      editorOrigin: 'managed',
      managedTemplateId: 'tpl-123',
      activeTemplate: {
        label: '원본 템플릿',
        ver: 'v1.0',
        clauses: [],
        aiSuggest: { title: '', body: '' },
      } as any,
      clauses: [
        {
          num: '§1',
          title: '원본 조항',
          state: 'approved',
          bodyFormat: 'html',
          body: '<p>사용자가 수정한 본문</p>',
        } as any,
      ],
      displayVer: 'v1.0',
      saveGeneration: 1,
      versionReviewByVer: { 'v1.0': 'pending' },
    });

    useAppStore.getState().saveVersion();

    const after = useTemplateListStore.getState().items[0];
    expect(after.ver).toBe('v1.0');
    expect(after.clauses).toEqual(originalTemplate.clauses);
    expect(after.clauseCount).toBe(1);
  });

  it('matrix origin 편집기에서 저장해도 템플릿 관리 원본은 영향을 받지 않는다', async () => {
    vi.doMock('../lib/supabase/client', () => ({
      isSupabaseConfigured: () => true,
    }));
    vi.doMock('../lib/supabase/managedTemplateCatalogDb', () => ({
      fetchManagedTemplateCatalog: vi.fn(),
      pushManagedTemplateCatalog: vi.fn().mockResolvedValue(undefined),
    }));
    vi.doMock('../lib/authSession', () => ({
      loadAuthSession: () => null,
      saveAuthSession: vi.fn(),
      clearAuthSession: vi.fn(),
    }));

    const { useAppStore } = await import('./useAppStore');
    const { useTemplateListStore } = await import('./useTemplateListStore');

    const originalTemplate = {
      id: 'tpl-abc',
      name: '원본',
      ver: 'v2.5',
      status: 'active',
      tone: 'primary',
      clauseCount: 2,
      clauses: [],
    } as any;
    useTemplateListStore.setState({ items: [originalTemplate] });

    useAppStore.setState({
      editorOrigin: 'matrix',
      managedTemplateId: null,
      activeTemplate: {
        label: '매트릭스 템플릿',
        ver: 'v1.0',
        clauses: [],
        aiSuggest: { title: '', body: '' },
      } as any,
      clauses: [],
      displayVer: 'v1.0',
      saveGeneration: 1,
      versionReviewByVer: { 'v1.0': 'pending' },
    });

    useAppStore.getState().saveVersion();

    expect(useTemplateListStore.getState().items[0]).toBe(originalTemplate);
  });
});
