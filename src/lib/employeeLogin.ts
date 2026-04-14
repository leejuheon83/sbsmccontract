/**
 * 사번·비밀번호 로그인 — 사용자 관리( Supabase 또는 localStorage )에 등록된 계정만 허용.
 * 운영에서는 서버(API) 검증·세션으로 교체하세요.
 */

import { loadUsersFromPersistence } from './userAdminPersist';

const EMPLOYEE_ID_PATTERN = /^[A-Za-z0-9_-]{3,32}$/;

export function normalizeEmployeeId(raw: string): string {
  return raw.trim();
}

export function validateEmployeeIdFormat(employeeId: string): string | null {
  if (!employeeId) return '사번을 입력해 주세요.';
  if (!EMPLOYEE_ID_PATTERN.test(employeeId)) {
    return '사번은 영문·숫자·하이픈·밑줄 3~32자만 사용할 수 있습니다.';
  }
  return null;
}

export type EmployeeLoginResult =
  | { ok: true; employeeId: string; department: string; displayName: string }
  | { ok: false; error: string };

/**
 * [API] 운영: POST /api/auth/login 등으로 대체
 */
export async function authenticateEmployeeCredentials(
  rawEmployeeId: string,
  password: string,
): Promise<EmployeeLoginResult> {
  const employeeId = normalizeEmployeeId(rawEmployeeId);
  const idErr = validateEmployeeIdFormat(employeeId);
  if (idErr) return { ok: false, error: idErr };

  if (!password) {
    return { ok: false, error: '비밀번호를 입력해 주세요.' };
  }

  let users;
  try {
    users = await loadUsersFromPersistence();
  } catch {
    return {
      ok: false,
      error:
        '사용자 정보를 불러올 수 없습니다. 네트워크와 설정(Supabase)을 확인해 주세요.',
    };
  }

  const user = users.find((u) => u.employeeId === employeeId);

  if (!user) {
    return {
      ok: false,
      error: '등록되지 않은 사번입니다. 관리자에게 계정 발급을 요청하세요.',
    };
  }

  if (!user.isActive) {
    return { ok: false, error: '비활성 처리된 계정입니다. 관리자에게 문의하세요.' };
  }

  if (!user.loginPassword) {
    return {
      ok: false,
      error: '로그인 비밀번호가 설정되지 않았습니다. 관리자에게 문의하세요.',
    };
  }

  if (user.loginPassword !== password) {
    return { ok: false, error: '비밀번호가 올바르지 않습니다.' };
  }

  return {
    ok: true,
    employeeId,
    department: user.department,
    displayName: user.name,
  };
}
