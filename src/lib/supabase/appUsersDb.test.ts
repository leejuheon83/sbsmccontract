import { describe, expect, it } from 'vitest';
import type { User } from '../../types/contract';
import {
  appUserRowToUser,
  userToAppUserRow,
} from './appUsersDb';

const sampleUser: User = {
  id: 'a@b.co.kr',
  email: 'a@b.co.kr',
  employeeId: 'EMP01',
  loginPassword: 'x',
  name: '홍길동',
  department: '영업1팀',
  isActive: true,
};

describe('appUsersDb mapping', () => {
  it('userToAppUserRow / appUserRowToUser roundtrip', () => {
    const row = userToAppUserRow(sampleUser);
    expect(row).toEqual({
      id: 'a@b.co.kr',
      email: 'a@b.co.kr',
      employee_id: 'EMP01',
      login_password: 'x',
      name: '홍길동',
      department: '영업1팀',
      is_active: true,
    });
    expect(appUserRowToUser(row)).toEqual(sampleUser);
  });
});
