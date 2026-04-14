import { describe, expect, it } from 'vitest';
import type { User } from '../types/contract';
import {
  canAccessUserManagement,
  canAddNewManagedTemplate,
  isAdminOrManagementSupport,
} from './userManagementPolicy';

const baseUser = (partial: Partial<User> & Pick<User, 'employeeId'>): User => ({
  id: `${partial.employeeId}@x.com`,
  email: `${partial.employeeId}@x.com`,
  employeeId: partial.employeeId,
  loginPassword: 'x',
  name: 'T',
  department: partial.department ?? '영업1팀',
  isActive: partial.isActive ?? true,
});

describe('isAdminOrManagementSupport', () => {
  it('canAccessUserManagement 와 동일 조건', () => {
    const a = { employeeId: 'admin' as const, department: '영업3팀' };
    expect(isAdminOrManagementSupport(a)).toBe(canAccessUserManagement(a));
  });
});

describe('canAccessUserManagement', () => {
  it('사번 admin 이면 부서와 무관하게 허용', () => {
    expect(
      canAccessUserManagement({
        employeeId: 'admin',
        department: '영업3팀',
      }),
    ).toBe(true);
  });

  it('경영지원팀이면 허용', () => {
    expect(
      canAccessUserManagement({
        employeeId: 'U001',
        department: '경영지원팀',
      }),
    ).toBe(true);
  });

  it('그 외 부서·사번은 거부', () => {
    expect(
      canAccessUserManagement({
        employeeId: 'U001',
        department: '영업3팀',
      }),
    ).toBe(false);
  });

  it('사번 없으면 부서만으로 판단', () => {
    expect(
      canAccessUserManagement({ employeeId: null, department: '경영지원팀' }),
    ).toBe(true);
    expect(
      canAccessUserManagement({ employeeId: null, department: '영업1팀' }),
    ).toBe(false);
  });
});

describe('canAddNewManagedTemplate', () => {
  it('사번 admin 이면 세션 부서와 무관하게 허용', () => {
    expect(canAddNewManagedTemplate('admin', '영업3팀', [])).toBe(true);
  });

  it('목록에 있으면 해당 행의 부서로만 판단(경영지원팀 허용)', () => {
    const users = [baseUser({ employeeId: 'M1', department: '경영지원팀' })];
    expect(canAddNewManagedTemplate('M1', '영업3팀', users)).toBe(true);
  });

  it('목록에 있으면 영업 부서는 세션이 경영이라도 거부', () => {
    const users = [baseUser({ employeeId: 'S1', department: '영업3팀' })];
    expect(canAddNewManagedTemplate('S1', '경영지원팀', users)).toBe(false);
  });

  it('비활성 계정은 거부', () => {
    const users = [
      baseUser({ employeeId: 'M2', department: '경영지원팀', isActive: false }),
    ];
    expect(canAddNewManagedTemplate('M2', '경영지원팀', users)).toBe(false);
  });

  it('목록에 없으면 세션 부서가 경영지원팀이면 허용', () => {
    expect(canAddNewManagedTemplate('REMOTE1', '경영지원팀', [])).toBe(true);
  });

  it('목록에 없고 세션도 영업이면 거부', () => {
    expect(canAddNewManagedTemplate('REMOTE1', '영업3팀', [])).toBe(false);
  });

  it('사번 없으면 거부', () => {
    expect(canAddNewManagedTemplate(null, '경영지원팀', [])).toBe(false);
  });
});
