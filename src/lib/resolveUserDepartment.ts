import type { User } from '../types/contract';
import { loadUsersFromLocalStorage } from './userAdminPersist';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from './userDepartments';

/**
 * 사용자 관리에 등록된 사번의 부서. 없으면 경영지원팀(폴백).
 * `usersOverride`를 주면 localStorage 대신 해당 배열로 조회(방금 저장한 목록 반영용).
 */
export function departmentForRegisteredEmployee(
  employeeId: string | null | undefined,
  usersOverride?: User[],
): string {
  const id = employeeId?.trim();
  if (!id) return MANAGEMENT_SUPPORT_DEPARTMENT;
  const users = usersOverride ?? loadUsersFromLocalStorage();
  const u = users.find((x) => x.employeeId.trim() === id);
  const dep = u?.department?.trim();
  return dep || MANAGEMENT_SUPPORT_DEPARTMENT;
}
