import type { User } from '../types/contract';

export type UserDraft = Omit<User, 'id'>;
export type UserPatch = Partial<Omit<User, 'id'>> & { email?: string };

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getIdFromEmail(email: string): string {
  return normalizeEmail(email);
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`Duplicate email: ${email}`);
  }
}

export class DuplicateEmployeeIdError extends Error {
  constructor(employeeId: string) {
    super(`Duplicate employeeId: ${employeeId}`);
  }
}

export class NotFoundError extends Error {
  constructor(id: string) {
    super(`User not found: ${id}`);
  }
}

export function addUser(users: User[], draft: UserDraft): User[] {
  const id = getIdFromEmail(draft.email);
  if (users.some((u) => u.id === id)) {
    throw new DuplicateEmailError(draft.email);
  }
  const empId = draft.employeeId.trim();
  if (users.some((u) => u.employeeId === empId)) {
    throw new DuplicateEmployeeIdError(empId);
  }
  const next: User = { ...draft, id, employeeId: empId };
  next.email = normalizeEmail(next.email);
  return [...users, next];
}

export function updateUser(
  users: User[],
  id: string,
  patch: UserPatch,
): User[] {
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new NotFoundError(id);

  const current = users[idx]!;
  const nextEmail =
    patch.email != null ? normalizeEmail(patch.email) : current.email;
  const nextId = getIdFromEmail(nextEmail);

  if (nextId !== id && users.some((u) => u.id === nextId)) {
    throw new DuplicateEmailError(nextEmail);
  }

  const nextEmp =
    patch.employeeId != null
      ? patch.employeeId.trim()
      : current.employeeId;
  if (
    users.some(
      (u) => u.id !== id && u.employeeId === nextEmp,
    )
  ) {
    throw new DuplicateEmployeeIdError(nextEmp);
  }

  const merged: User = {
    ...current,
    ...patch,
    email: nextEmail,
    id: nextId,
    employeeId: nextEmp,
  };

  const nextUsers = users.slice();
  nextUsers[idx] = merged;
  return nextUsers;
}

export function deleteUser(users: User[], id: string): User[] {
  return users.filter((u) => u.id !== id);
}

export function toggleActive(users: User[], id: string): User[] {
  return users.map((u) =>
    u.id === id ? { ...u, isActive: !u.isActive } : u,
  );
}

export type UserFilterTab = 'all' | 'active' | 'inactive';

export function filterUsers(params: {
  users: User[];
  query: string;
  tab: UserFilterTab;
}): User[] {
  const { users, query, tab } = params;
  const q = query.trim().toLowerCase();
  return users.filter((u) => {
    if (tab === 'active' && !u.isActive) return false;
    if (tab === 'inactive' && u.isActive) return false;
    if (!q) return true;
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.employeeId.toLowerCase().includes(q) ||
      u.department.toLowerCase().includes(q)
    );
  });
}

