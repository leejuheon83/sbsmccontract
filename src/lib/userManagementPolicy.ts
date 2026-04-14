import type { User } from '../types/contract';
import { RESERVED_SYSTEM_EMPLOYEE_ID } from './userAdminDefaults';
import { loadUsersFromLocalStorage } from './userAdminPersist';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from './userDepartments';

/** 사번 admin 또는 경영지원팀 소속 */
export function isAdminOrManagementSupport(input: {
  employeeId: string | null | undefined;
  department: string;
}): boolean {
  const id = input.employeeId?.trim();
  if (id === RESERVED_SYSTEM_EMPLOYEE_ID) return true;
  return input.department.trim() === MANAGEMENT_SUPPORT_DEPARTMENT;
}

/**
 * 템플릿 관리「새 템플릿」추가만 허용.
 * 시스템 사번 admin 또는 경영지원팀 소속(사용자 목록에 있으면 목록 기준, 없으면 로그인 세션 부서).
 */
export function canAddNewManagedTemplate(
  employeeId: string | null | undefined,
  sessionDepartment: string,
  usersOverride?: User[],
): boolean {
  const id = employeeId?.trim();
  if (!id) return false;
  if (id === RESERVED_SYSTEM_EMPLOYEE_ID) return true;
  const users = usersOverride ?? loadUsersFromLocalStorage();
  const u = users.find((x) => x.employeeId.trim() === id);
  if (u) {
    if (u.isActive === false) return false;
    return u.department.trim() === MANAGEMENT_SUPPORT_DEPARTMENT;
  }
  return sessionDepartment.trim() === MANAGEMENT_SUPPORT_DEPARTMENT;
}

/** 사용자 관리(계정 CRUD): 경영지원팀 소속 또는 시스템 사번 admin 만 */
export function canAccessUserManagement(
  input: Parameters<typeof isAdminOrManagementSupport>[0],
): boolean {
  return isAdminOrManagementSupport(input);
}
