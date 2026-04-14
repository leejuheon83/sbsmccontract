import type { StoredContractDraft } from './contractDraftTypes';

function norm(s: string): string {
  return s.trim();
}

/** 로그인 사번 기준으로 이 초안이 해당 사용자 소유인지 (목록·대시보드 필터) */
export function draftBelongsToEmployee(
  d: StoredContractDraft,
  employeeId: string | null | undefined,
): boolean {
  const emp = norm(employeeId ?? '');
  if (!emp) return false;
  if (d.ownerEmployeeId != null && norm(d.ownerEmployeeId) !== '') {
    return norm(d.ownerEmployeeId) === emp;
  }
  return d.auditEntries.some((e) => norm(e.author) === emp);
}
