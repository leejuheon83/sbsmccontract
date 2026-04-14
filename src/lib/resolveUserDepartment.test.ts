import { describe, expect, it } from 'vitest';
import type { User } from '../types/contract';
import { departmentForRegisteredEmployee } from './resolveUserDepartment';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from './userDepartments';

const sample: User[] = [
  {
    id: 'a@x.com',
    email: 'a@x.com',
    employeeId: '250007',
    loginPassword: 'x',
    name: '테스트',
    department: '광고기획팀',
    isActive: true,
  },
];

describe('departmentForRegisteredEmployee', () => {
  it('override 목록에서 사번으로 부서 반환', () => {
    expect(
      departmentForRegisteredEmployee('250007', sample),
    ).toBe('광고기획팀');
  });

  it('목록에 없으면 경영지원팀 폴백', () => {
    expect(departmentForRegisteredEmployee('UNKNOWN', sample)).toBe(
      MANAGEMENT_SUPPORT_DEPARTMENT,
    );
  });

  it('사번이 비면 폴백', () => {
    expect(departmentForRegisteredEmployee('', sample)).toBe(
      MANAGEMENT_SUPPORT_DEPARTMENT,
    );
  });
});
