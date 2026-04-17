import { create } from 'zustand';
import {
  applyAdd,
  applyDiscard,
  applyRemove,
  applyUpdateItem,
} from '../lib/templateListOps';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { fetchManagedTemplateCatalog } from '../lib/supabase/managedTemplateCatalogDb';
import type { Clause } from '../types/contract';
import type { TemplateListItem } from '../types/managedTemplate';

// 초기에는 샘플 템플릿 없이 비어 있는 상태에서 시작하고,
// 이후 사용자가 추가하는 항목과 IndexedDB에 저장된 목록만 사용합니다.
const initialItems: TemplateListItem[] = [];

interface TemplateListState {
  items: TemplateListItem[];
  addItem: (item: TemplateListItem) => void;
  updateItem: (id: string, patch: Partial<TemplateListItem>) => void;
  discardItem: (id: string) => void;
  removeItem: (id: string) => void;
  syncFromEditor: (id: string, clauses: Clause[], ver: string) => void;
}

function persistItems(items: TemplateListItem[]) {
  void pushCatalogToCloudWhenAdmin(items).catch((e) =>
    console.error('managed templates cloud save failed', e),
  );
}

/** 관리자·경영지원 저장 시 Supabase 전역 목록에 반영(같은 프로젝트 로그인 사용자와 공유) */
async function pushCatalogToCloudWhenAdmin(items: TemplateListItem[]) {
  if (!isSupabaseConfigured()) return;
  const { isAdminOrManagementSupport } = await import(
    '../lib/userManagementPolicy'
  );
  const { useAppStore } = await import('./useAppStore');
  const { pushManagedTemplateCatalog } = await import(
    '../lib/supabase/managedTemplateCatalogDb'
  );
  const { authEmployeeId, currentUserDepartment } = useAppStore.getState();
  if (
    !isAdminOrManagementSupport({
      employeeId: authEmployeeId,
      department: currentUserDepartment,
    })
  ) {
    return;
  }
  await pushManagedTemplateCatalog(items);
}

export const useTemplateListStore = create<TemplateListState>((set, get) => ({
  items: initialItems,
  addItem: (item) => {
    if (!isSupabaseConfigured()) return;
    set((s) => ({ items: applyAdd(s.items, item) }));
    persistItems(get().items);
  },
  updateItem: (id, patch) => {
    if (!isSupabaseConfigured()) return;
    set((s) => ({ items: applyUpdateItem(s.items, id, patch) }));
    persistItems(get().items);
  },
  discardItem: (id) => {
    if (!isSupabaseConfigured()) return;
    set((s) => ({ items: applyDiscard(s.items, id) }));
    persistItems(get().items);
  },
  removeItem: (id) => {
    if (!isSupabaseConfigured()) return;
    set((s) => ({ items: applyRemove(s.items, id) }));
    persistItems(get().items);
  },
  syncFromEditor: (id, clauses, ver) => {
    if (!isSupabaseConfigured()) return;
    set((s) => ({
      items: s.items.map((it) =>
        it.id === id
          ? {
              ...it,
              ver,
              clauses: clauses.map((c) => ({ ...c })),
              clauseCount: clauses.length,
              clausesAuthoritative: true,
            }
          : it,
      ),
    }));
    persistItems(get().items);
  },
}));

/**
 * Supabase가 설정된 경우 클라우드 목록을 우선(로그인 사용자 전원 동일 데이터).
 * 로컬(IndexedDB/localStorage)에는 저장/조회하지 않습니다.
 */
export async function hydrateManagedTemplateList(): Promise<void> {
  if (!isSupabaseConfigured()) {
    useTemplateListStore.setState({ items: [] });
    return;
  }
  try {
    const cloudItems = await fetchManagedTemplateCatalog();
    useTemplateListStore.setState({ items: cloudItems ?? [] });
  } catch (e) {
    console.warn('[ContractOS] managed templates cloud load failed', e);
    useTemplateListStore.setState({ items: [] });
  }
}
