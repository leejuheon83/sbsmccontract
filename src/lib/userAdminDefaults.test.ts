import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ADMIN_USER,
  DEFAULT_SEED_USERS,
  RESERVED_SYSTEM_EMPLOYEE_ID,
} from './userAdminDefaults';

describe('userAdminDefaults', () => {
  it('기본 시드는 6명이며 admin이 첫 행', () => {
    expect(DEFAULT_SEED_USERS).toHaveLength(6);
    expect(DEFAULT_ADMIN_USER).toBe(DEFAULT_SEED_USERS[0]);
    expect(DEFAULT_ADMIN_USER.employeeId).toBe(RESERVED_SYSTEM_EMPLOYEE_ID);
    expect(DEFAULT_ADMIN_USER.loginPassword).toBe('admin');
  });

  it('사번·이메일이 서로 중복되지 않음', () => {
    const ids = DEFAULT_SEED_USERS.map((u) => u.employeeId);
    const emails = DEFAULT_SEED_USERS.map((u) => u.email);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(emails).size).toBe(emails.length);
  });
});
