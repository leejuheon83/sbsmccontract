import type { Role } from '../types/contract';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from './userDepartments';

/** 법무·관리자만 버전 검토 승인/반려 가능 (RBAC) */
export function canPerformLegalReview(role: Role): boolean {
  return role === 'legal' || role === 'admin';
}

/** 계약서 검토·승인(버전 이력 등): 경영지원팀 소속만 */
export function canPerformContractReviewByDepartment(
  department: string,
): boolean {
  return department.trim() === MANAGEMENT_SUPPORT_DEPARTMENT;
}

export type VersionReviewState = 'pending' | 'approved' | 'rejected';

export function defaultReviewForVer(
  map: Record<string, VersionReviewState>,
  ver: string,
): VersionReviewState {
  return map[ver] ?? 'pending';
}
