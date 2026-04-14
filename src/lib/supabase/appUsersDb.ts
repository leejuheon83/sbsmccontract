import type { User } from '../../types/contract';
import { getSupabaseBrowserClient } from './client';

/** DB snake_case ↔ 앱 User */
export type AppUserRow = {
  id: string;
  email: string;
  employee_id: string;
  login_password: string;
  name: string;
  department: string;
  is_active: boolean;
};

export function appUserRowToUser(row: AppUserRow): User {
  return {
    id: row.id,
    email: row.email,
    employeeId: row.employee_id,
    loginPassword: row.login_password,
    name: row.name,
    department: row.department,
    isActive: row.is_active,
  };
}

export function userToAppUserRow(u: User): AppUserRow {
  return {
    id: u.id,
    email: u.email,
    employee_id: u.employeeId,
    login_password: u.loginPassword,
    name: u.name,
    department: u.department,
    is_active: u.isActive,
  };
}

export async function fetchAppUsers(): Promise<User[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from('app_users')
    .select(
      'id, email, employee_id, login_password, name, department, is_active',
    )
    .order('employee_id', { ascending: true });

  if (error) throw error;
  const rows = (data ?? []) as AppUserRow[];
  return rows.map(appUserRowToUser);
}

/**
 * 목록을 DB와 일치시킵니다. 클라이언트에 없는 id 행은 삭제 후, 전 행 upsert.
 */
export async function syncAppUsers(users: User[]): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const wantIds = new Set(users.map((u) => u.id));

  const { data: existing, error: selErr } = await supabase
    .from('app_users')
    .select('id');
  if (selErr) throw selErr;

  const toDelete = (existing ?? [])
    .map((r: { id: string }) => r.id)
    .filter((id: string) => !wantIds.has(id));

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase
      .from('app_users')
      .delete()
      .in('id', toDelete);
    if (delErr) throw delErr;
  }

  const rows = users.map(userToAppUserRow);
  const { error: upErr } = await supabase.from('app_users').upsert(rows, {
    onConflict: 'id',
  });
  if (upErr) throw upErr;
}
