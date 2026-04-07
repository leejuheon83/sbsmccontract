import { describe, expect, it } from 'vitest';
import type { User } from '../types/contract';
import { parseStoredUsers, serializeUsersForStorage } from './userAdminPersist';

describe('userAdminPersist', () => {
  it('parseStoredUsers: 잘못된 입력은 빈 배열', () => {
    expect(parseStoredUsers(null)).toEqual([]);
    expect(parseStoredUsers(undefined)).toEqual([]);
    expect(parseStoredUsers('')).toEqual([]);
    expect(parseStoredUsers('not json')).toEqual([]);
    expect(parseStoredUsers({})).toEqual([]);
    expect(parseStoredUsers([1, 2])).toEqual([]);
  });

  it('parseStoredUsers: team(구형)을 department로 승격', () => {
    const raw = [
      {
        id: 'a@x.com',
        email: 'a@x.com',
        name: 'A',
        team: '영업3팀',
        isActive: true,
      },
      { email: 'broken' },
    ];
    const out = parseStoredUsers(raw);
    expect(out).toHaveLength(1);
    expect(out[0]!.email).toBe('a@x.com');
    expect(out[0]!.department).toBe('영업3팀');
  });

  it('serializeUsersForStorage / parse roundtrip', () => {
    const users: User[] = [
      {
        id: 'u@x.com',
        email: 'u@x.com',
        name: '유저',
        department: '경영지원팀',
        isActive: false,
      },
    ];
    const json = serializeUsersForStorage(users);
    const back = parseStoredUsers(JSON.parse(json));
    expect(back).toEqual(users);
  });
});
