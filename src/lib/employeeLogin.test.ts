import { describe, expect, it, vi } from 'vitest';
import {
  authenticateEmployeeCredentials,
  normalizeEmployeeId,
  validateEmployeeIdFormat,
} from './employeeLogin';
import * as persist from './userAdminPersist';
import type { User } from '../types/contract';

describe('validateEmployeeIdFormat', () => {
  it('빈 값이면 메시지', () => {
    expect(validateEmployeeIdFormat('')).not.toBeNull();
  });
  it('짧은 사번 거부', () => {
    expect(validateEmployeeIdFormat('ab')).not.toBeNull();
  });
  it('허용 문자로 통과', () => {
    expect(validateEmployeeIdFormat('EMP001')).toBeNull();
    expect(validateEmployeeIdFormat('admin')).toBeNull();
  });
});

describe('normalizeEmployeeId', () => {
  it('앞뒤 공백 제거', () => {
    expect(normalizeEmployeeId('  ABC12  ')).toBe('ABC12');
  });
});

describe('authenticateEmployeeCredentials (등록 사용자만)', () => {
  it('등록된 사번·비번이 맞으면 성공', async () => {
    const users: User[] = [
      {
        id: 'u@x.com',
        email: 'u@x.com',
        employeeId: 'EMP001',
        loginPassword: 'secret123',
        name: '테스트',
        department: '영업1팀',
        isActive: true,
      },
    ];
    vi.spyOn(persist, 'loadUsersFromPersistence').mockResolvedValue(users);
    const r = await authenticateEmployeeCredentials('EMP001', 'secret123');
    expect(r).toEqual({
      ok: true,
      employeeId: 'EMP001',
      department: '영업1팀',
      displayName: '테스트',
    });
    vi.restoreAllMocks();
  });

  it('미등록 사번이면 실패', async () => {
    vi.spyOn(persist, 'loadUsersFromPersistence').mockResolvedValue([]);
    const r = await authenticateEmployeeCredentials('NOBODY', 'x');
    expect(r.ok).toBe(false);
    vi.restoreAllMocks();
  });
});
