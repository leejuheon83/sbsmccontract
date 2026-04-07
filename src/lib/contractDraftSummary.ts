import type { StoredContractDraft } from './contractDraftTypes';

/** HTML 제거 후 첫 본문 일부 — 목록 「저장 요약」 컬럼용 */
export function summarizeDraftBodyPreview(draft: StoredContractDraft, maxLen = 96): string {
  const first = draft.clauses.map((c) => c.body).find((b) => b && String(b).trim());
  if (!first) return '—';
  const plain = String(first)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return '—';
  if (plain.length <= maxLen) return plain;
  return `${plain.slice(0, Math.max(0, maxLen - 1))}…`;
}
