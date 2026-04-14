import { describe, expect, it } from 'vitest';
import type { User } from '../types/contract';
import {
  addUser,
  DuplicateEmailError,
  DuplicateEmployeeIdError,
  filterUsers,
  toggleActive,
  updateUser,
} from './userAdminOps';

const make = (
  u: Partial<User> & Pick<User, 'email' | 'name' | 'department'>,
): User => {
  const email = u.email.trim().toLowerCase();
  return {
    id: u.id ?? email,
    email: u.email,
    employeeId: u.employeeId ?? email.split('@')[0]!,
    loginPassword: u.loginPassword ?? 'password1234',
    name: u.name,
    department: u.department,
    isActive: u.isActive ?? true,
  };
};

describe('userAdminOps', () => {
  it('addUser: email 중복이면 에러', () => {
    const users = [
      make({ name: 'A', email: 'a@x.com', department: '영업1팀' }),
    ];
    expect(() =>
      addUser(users, {
        name: 'B',
        email: 'A@X.com',
        department: '영업2팀',
        isActive: true,
        employeeId: 'B002',
        loginPassword: 'pw123456',
      }),
    ).toThrow(DuplicateEmailError);
  });

  it('addUser: 사번 중복이면 에러', () => {
    const users = [
      make({
        name: 'A',
        email: 'a@x.com',
        department: '영업1팀',
        employeeId: 'SAME',
      }),
    ];
    expect(() =>
      addUser(users, {
        name: 'B',
        email: 'b@x.com',
        department: '영업2팀',
        isActive: true,
        employeeId: 'SAME',
        loginPassword: 'pw123456',
      }),
    ).toThrow(DuplicateEmployeeIdError);
  });

  it('updateUser: email 변경 시 id와 email이 반영', () => {
    const users = [
      make({ name: 'A', email: 'a@x.com', department: '영업1팀' }),
    ];
    const next = updateUser(users, 'a@x.com', { email: 'b@x.com' });
    expect(next).toHaveLength(1);
    expect(next[0]!.id).toBe('b@x.com');
    expect(next[0]!.email).toBe('b@x.com');
  });

  it('toggleActive: isActive 토글', () => {
    const users = [
      make({ name: 'A', email: 'a@x.com', department: '영업1팀', isActive: true }),
    ];
    const next = toggleActive(users, 'a@x.com');
    expect(next[0]!.isActive).toBe(false);
  });

  it('filterUsers: query/tab 필터링 (사번)', () => {
    const users = [
      make({
        name: '김민준',
        email: 'a@x.com',
        department: '영업2팀',
        employeeId: 'KIM001',
        isActive: true,
      }),
      make({
        name: '이지수',
        email: 'b@x.com',
        department: '광고기획팀',
        employeeId: 'LEE002',
        isActive: true,
      }),
      make({
        name: '박성현',
        email: 'c@x.com',
        department: '경영지원팀',
        employeeId: 'PARK03',
        isActive: false,
      }),
    ];
    const out = filterUsers({ users, query: 'LEE', tab: 'active' });
    expect(out).toHaveLength(1);
    expect(out[0]!.name).toBe('이지수');
  });
});
