import type { User } from '../types/contract';

export const USER_ADMIN_STORAGE_KEY = 'contractos-admin-users-v2';

function departmentFromUnknown(o: Record<string, unknown>): string {
  if (typeof o.department === 'string' && o.department.trim()) {
    return o.department.trim();
  }
  if (typeof o.team === 'string' && o.team.trim()) {
    return o.team.trim();
  }
  return '';
}

function isUserRecord(x: unknown): x is User {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (typeof o.id !== 'string' || !o.id.trim()) return false;
  if (typeof o.email !== 'string' || !o.email.includes('@')) return false;
  if (typeof o.name !== 'string') return false;
  if (o.isActive !== true && o.isActive !== false) return false;
  const dep = departmentFromUnknown(o);
  if (!dep) return false;
  return true;
}

function normalizeToUser(o: Record<string, unknown>): User {
  return {
    id: String(o.id).trim(),
    email: String(o.email).trim(),
    name: String(o.name),
    department: departmentFromUnknown(o),
    isActive: o.isActive === true,
  };
}

/** JSON 또는 파싱된 값에서 사용자 배열만 안전하게 추출 */
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
    .filter(isUserRecord)
    .map((raw) => normalizeToUser(raw as unknown as Record<string, unknown>));
}

export function serializeUsersForStorage(users: User[]): string {
  return JSON.stringify(users);
}

export function loadUsersFromLocalStorage(): User[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const v2 = localStorage.getItem(USER_ADMIN_STORAGE_KEY);
    if (v2) return parseStoredUsers(JSON.parse(v2));
    const v1 = localStorage.getItem('contractos-admin-users-v1');
    if (v1) {
      const migrated = parseStoredUsers(JSON.parse(v1));
      if (migrated.length) {
        localStorage.setItem(USER_ADMIN_STORAGE_KEY, serializeUsersForStorage(migrated));
      }
      return migrated;
    }
    return [];
  } catch {
    return [];
  }
}

export function saveUsersToLocalStorage(users: User[]): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(USER_ADMIN_STORAGE_KEY, serializeUsersForStorage(users));
}
