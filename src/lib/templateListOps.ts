import type { TemplateListItem } from '../types/managedTemplate';

export function applyUpdateItem(
  items: TemplateListItem[],
  id: string,
  patch: Partial<TemplateListItem>,
): TemplateListItem[] {
  return items.map((it) =>
    it.id === id ? { ...it, ...patch, id: it.id, status: it.status } : it,
  );
}

export function applyDiscard(
  items: TemplateListItem[],
  id: string,
): TemplateListItem[] {
  return items.map((i) =>
    i.id === id ? { ...i, status: 'discarded' as const } : i,
  );
}

export function applyRemove(items: TemplateListItem[], id: string): TemplateListItem[] {
  return items.filter((i) => i.id !== id);
}

export function applyAdd(
  items: TemplateListItem[],
  item: TemplateListItem,
): TemplateListItem[] {
  return [...items, item];
}

export function formatTemplateMeta(
  clauseCount: number,
  formFieldCount: number,
  discarded?: boolean,
): string {
  const empty = clauseCount === 0 && formFieldCount === 0;
  if (discarded) {
    if (empty) return '폐기됨';
    return `조항 ${clauseCount}개 · 폐기됨`;
  }
  if (empty) return '관리용 템플릿';
  return `조항 ${clauseCount}개 · 폼 필드 ${formFieldCount}개`;
}

export function formatTemplateMetaFromItem(item: import('../types/managedTemplate').TemplateListItem): string {
  const link =
    item.linkedDocType != null
      ? ` · ③연결: ${item.linkedDocType}${
          item.linkedFormType ? ` / ${item.linkedFormType}` : ''
        }${item.linkedGenre ? ` (${item.linkedGenre})` : ''}`
      : '';
  if (item.attachment) {
    const hint = item.attachment.textContent ? '본문 로드됨' : '본문 미추출';
    const tail = item.status === 'discarded' ? ' · 폐기됨' : '';
    return `${item.attachment.fileName} · ${hint}${link}${tail}`;
  }
  const base = formatTemplateMeta(
    item.clauseCount,
    item.formFieldCount,
    item.status === 'discarded',
  );
  return link ? `${base}${link}` : base;
}
