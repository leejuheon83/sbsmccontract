import type { User } from '../types/contract';
import {
  DEFAULT_ADMIN_USER,
  DEFAULT_SEED_USERS,
  RESERVED_SYSTEM_EMPLOYEE_ID,
} from './userAdminDefaults';
import { isSupabaseConfigured } from './supabase/client';
import { fetchAppUsers, syncAppUsers } from './supabase/appUsersDb';

export const USER_ADMIN_STORAGE_KEY = 'contractos-admin-users-v3';

const EMPLOYEE_FALLBACK = /^[A-Za-z0-9_-]{3,32}$/;

function departmentFromUnknown(o: Record<string, unknown>): string {
  if (typeof o.department === 'string' && o.department.trim()) {
    return o.department.trim();
  }
  if (typeof o.team === 'string' && o.team.trim()) {
    return o.team.trim();
  }
  return '';
}

function deriveEmployeeIdFromLegacy(
  email: string,
  id: string,
): string {
  const local = email.split('@')[0]?.trim() ?? '';
  if (EMPLOYEE_FALLBACK.test(local)) return local;
  const idTrim = id.trim();
  if (EMPLOYEE_FALLBACK.test(idTrim)) return idTrim;
  const slug = idTrim.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 28);
  const base = slug.length >= 3 ? slug : `usr${slug.padEnd(3, '0')}`.slice(0, 32);
  return base.slice(0, 32);
}

function normalizeToUser(o: Record<string, unknown>): User {
  const email = String(o.email).trim();
  const id = String(o.id).trim();
  const rawEmp = o.employeeId;
  const employeeId =
    typeof rawEmp === 'string' && rawEmp.trim()
      ? rawEmp.trim()
      : deriveEmployeeIdFromLegacy(email, id);
  const rawPw = o.loginPassword;
  const loginPassword =
    typeof rawPw === 'string' ? rawPw : '';

  return {
    id,
    email,
    employeeId,
    loginPassword,
    name: String(o.name),
    department: departmentFromUnknown(o),
    isActive: o.isActive === true,
  };
}

function isUserRecordBase(o: unknown): o is Record<string, unknown> {
  if (!o || typeof o !== 'object') return false;
  const r = o as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id.trim()) return false;
  if (typeof r.email !== 'string' || !r.email.includes('@')) return false;
  if (typeof r.name !== 'string') return false;
  if (r.isActive !== true && r.isActive !== false) return false;
  const dep = departmentFromUnknown(r);
  if (!dep) return false;
  return true;
}

/** JSON 또는 파싱된 값에서 사용자 배열만 안전하게 추출 (구형 v1/v2 → v3 필드 보강) */
export function parseStoredUsers(data: unknown): User[] {
  if (data == null) return [];
  if (typeof data === 'string') {
    try {
      return parseStoredUsers(JSON.parse(data));
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];
  return data
    .filter(isUserRecordBase)
    .map((raw) => normalizeToUser(raw));
}

export function serializeUsersForStorage(users: User[]): string {
  return JSON.stringify(users);
}

/**
 * 예전 데이터에 admin 행이 없거나(목록이 비어 있지 않아 시드가 안 된 경우),
 * 구 마이그레이션으로 loginPassword가 비어 있으면 기본 admin/admin을 보강합니다.
 */
export function ensureSystemAdminInUserList(users: User[]): {
  users: User[];
  changed: boolean;
} {
  const i = users.findIndex(
    (u) => u.employeeId === RESERVED_SYSTEM_EMPLOYEE_ID,
  );
  if (i === -1) {
    return { users: [DEFAULT_ADMIN_USER, ...users], changed: true };
  }
  const row = users[i]!;
  if (!row.loginPassword?.trim()) {
    const next = [...users];
    next[i] = { ...row, loginPassword: DEFAULT_ADMIN_USER.loginPassword };
    return { users: next, changed: true };
  }
  return { users, changed: false };
}

function readRawFromLocalStorage(): string | null {
  if (typeof localStorage === 'undefined') return null;
  const v3 = localStorage.getItem(USER_ADMIN_STORAGE_KEY);
  if (v3) return v3;
  const v2 = localStorage.getItem('contractos-admin-users-v2');
  if (v2) return v2;
  const v1 = localStorage.getItem('contractos-admin-users-v1');
  return v1;
}

/**
 * 사용자 목록 로드. 비어 있으면 기본 시드 사용자 목록을 저장합니다.
 */
export function loadUsersFromLocalStorage(): User[] {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_SEED_USERS.map((u) => ({ ...u }));
  }
  try {
    const raw = readRawFromLocalStorage();
    let users = raw ? parseStoredUsers(JSON.parse(raw)) : [];

    if (users.length === 0) {
      users = DEFAULT_SEED_USERS.map((u) => ({ ...u }));
      localStorage.setItem(
        USER_ADMIN_STORAGE_KEY,
        serializeUsersForStorage(users),
      );
      return users;
    }

    const ensured = ensureSystemAdminInUserList(users);
    users = ensured.users;
    if (ensured.changed) {
      saveUsersToLocalStorage(users);
    }

    if (!localStorage.getItem(USER_ADMIN_STORAGE_KEY)) {
      localStorage.setItem(
        USER_ADMIN_STORAGE_KEY,
        serializeUsersForStorage(users),
      );
    }

    return users;
  } catch {
    const fallback = DEFAULT_SEED_USERS.map((u) => ({ ...u }));
    try {
      localStorage.setItem(
        USER_ADMIN_STORAGE_KEY,
        serializeUsersForStorage(fallback),
      );
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

export function saveUsersToLocalStorage(users: User[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(USER_ADMIN_STORAGE_KEY, serializeUsersForStorage(users));
}

/**
 * Supabase(`app_users`)가 설정되어 있으면 원격, 아니면 localStorage.
 * 원격 조회 실패 시 localStorage로 폴백합니다.
 */
export async function loadUsersFromPersistence(): Promise<User[]> {
  if (!isSupabaseConfigured()) {
    return loadUsersFromLocalStorage();
  }
  try {
    const remote = await fetchAppUsers();
    if (remote.length === 0) {
      const seed = DEFAULT_SEED_USERS.map((u) => ({ ...u }));
      await syncAppUsers(seed);
      return seed;
    }
    const ensured = ensureSystemAdminInUserList(
      remote.map((u) => ({ ...u })),
    );
    const users = ensured.users;
    if (ensured.changed) {
      await syncAppUsers(users);
    }
    return users;
  } catch {
    return loadUsersFromLocalStorage();
  }
}

/** Supabase 사용 시 `app_users` 전체 동기화, 아니면 localStorage만 갱신 */
export async function saveUsersToPersistence(users: User[]): Promise<void> {
  const copy = users.map((u) => ({ ...u }));
  if (!isSupabaseConfigured()) {
    saveUsersToLocalStorage(copy);
    return;
  }
  await syncAppUsers(copy);
}
