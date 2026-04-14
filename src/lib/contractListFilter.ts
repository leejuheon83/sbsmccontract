import type { StoredContractDraft } from './contractDraftTypes';

/**
 * 검토/승인이 승인(approved)인지 — 대소문자·공백·비문자(JSON 등)도 허용
 */
export function isDraftReviewApproved(d: StoredContractDraft): boolean {
  const raw = d.reviewStatus ?? 'pending';
  return String(raw).trim().toLowerCase() === 'approved';
}

export type ContractListTab =
  | 'all'
  | 'draft'
  | 'in_review'
  | 'done'
  | 'archived';

/** 목록 상단 탭(전체·초안·검토 중·완료·보관)과 일치하는지 */
export function matchesContractListTab(
  d: StoredContractDraft,
  tab: ContractListTab,
): boolean {
  const rs = d.reviewStatus ?? 'pending';
  if (d.archived) {
    return tab === 'archived' || tab === 'all';
  }
  if (tab === 'all') return true;
  if (tab === 'archived') return false;
  switch (tab) {
    case 'draft':
      return rs === 'pending' || rs === 'rejected';
    case 'in_review':
      return rs === 'in_review';
    case 'done':
      return rs === 'approved';
    default:
      return false;
  }
}
