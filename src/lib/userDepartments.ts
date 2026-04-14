/** 계약서 검토·승인(버전/목록) 권한: 이 부서 소속만 */
export const MANAGEMENT_SUPPORT_DEPARTMENT = '경영지원팀' as const;

/** 사용자 관리 — 부서(드롭다운 고정 목록) */
export const USER_DEPARTMENTS = [
  '영업1팀',
  '영업2팀',
  '영업3팀',
  '영업4팀',
  '영업5팀',
  '영업6팀',
  '광고기획팀',
  '공공/네트워크팀',
  '사업입찰팀',
  '사업발전팀',
  '경영지원팀',
] as const;

export type UserDepartment = (typeof USER_DEPARTMENTS)[number];
