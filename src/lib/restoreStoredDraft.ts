import { TEMPLATES } from '../data/templates';
import type { ContractTemplate } from '../types/contract';
import { useTemplateListStore } from '../store/useTemplateListStore';
import { managedItemToContractTemplate } from './managedTemplateAdapter';
import type { StoredContractDraft } from './contractDraftTypes';

const FALLBACK_AI = {
  title: '저장된 초안',
  reason: '로컬에 저장된 스냅샷입니다.',
  body: '조항을 이어서 편집할 수 있습니다.',
};

/**
 * IndexedDB에 저장된 초안을 편집기에 올릴 때 사용할 템플릿 메타데이터.
 * 매트릭스/관리 템플릿을 찾지 못하면 저장된 label·조항으로 최소 셸을 만든다.
 */
export function resolveActiveTemplateForStoredDraft(
  draft: StoredContractDraft,
): ContractTemplate {
  const { selection, editorOrigin, managedTemplateId, templateLabel } = draft;

  if (editorOrigin === 'managed' && managedTemplateId) {
    const item = useTemplateListStore
      .getState()
      .items.find((i) => i.id === managedTemplateId && i.status === 'active');
    if (item) return managedItemToContractTemplate(item);
  }

  if (selection.genre && selection.type && selection.doc) {
    const t = TEMPLATES[selection.genre]?.[selection.type]?.[selection.doc];
    if (t) return t;
  }

  return {
    label: templateLabel.trim() || '저장된 초안',
    ver: draft.displayVer,
    tags: ['로컬 저장'],
    color: 'db-협찬',
    iconBg: '#DBEAFE',
    iconStroke: '#1E40AF',
    aiSuggest: FALLBACK_AI,
    clauses: draft.clauses.map((c) => ({ ...c })),
  };
}
