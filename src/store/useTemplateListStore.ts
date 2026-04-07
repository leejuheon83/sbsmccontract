import { create } from 'zustand';
import {
  applyAdd,
  applyDiscard,
  applyRemove,
  applyUpdateItem,
} from '../lib/templateListOps';
import {
  loadManagedTemplateListFromDb,
  saveManagedTemplateListToDb,
} from '../lib/managedTemplateListDb';
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
  void saveManagedTemplateListToDb(items).catch((e) =>
    console.error('managed templates persist failed', e),
  );
}

export const useTemplateListStore = create<TemplateListState>((set, get) => ({
  items: initialItems,
  addItem: (item) => {
    set((s) => ({ items: applyAdd(s.items, item) }));
    persistItems(get().items);
  },
  updateItem: (id, patch) => {
    set((s) => ({ items: applyUpdateItem(s.items, id, patch) }));
    persistItems(get().items);
  },
  discardItem: (id) => {
    set((s) => ({ items: applyDiscard(s.items, id) }));
    persistItems(get().items);
  },
  removeItem: (id) => {
    set((s) => ({ items: applyRemove(s.items, id) }));
    persistItems(get().items);
  },
  syncFromEditor: (id, clauses, ver) => {
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

/** IndexedDB에 저장된 목록이 있으면 불러와 덮어씁니다. */
export async function hydrateManagedTemplateList(): Promise<void> {
  const stored = await loadManagedTemplateListFromDb();
  if (stored && stored.length > 0) {
    useTemplateListStore.setState({ items: stored });
  }
}
