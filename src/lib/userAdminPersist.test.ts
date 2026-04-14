import { afterEach, describe, expect, it, vi } from 'vitest';
import type { User } from '../types/contract';
import { DEFAULT_SEED_USERS } from './userAdminDefaults';
import * as supabaseClient from './supabase/client';
import {
  ensureSystemAdminInUserList,
  loadUsersFromLocalStorage,
  loadUsersFromPersistence,
  parseStoredUsers,
  serializeUsersForStorage,
  USER_ADMIN_STORAGE_KEY,
} from './userAdminPersist';

describe('userAdminPersist', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadUsersFromPersistence: Supabase 미설정이면 localStorage와 동일', async () => {
    vi.spyOn(supabaseClient, 'isSupabaseConfigured').mockReturnValue(false);
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    } as Storage);

    const fromPersist = await loadUsersFromPersistence();
    const fromLocal = loadUsersFromLocalStorage();
    expect(fromPersist).toEqual(fromLocal);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('loadUsersFromLocalStorage: 저장소가 비어 있으면 기본 시드 6명', () => {
    const store: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
    } as Storage);

    const users = loadUsersFromLocalStorage();
    expect(users).toHaveLength(DEFAULT_SEED_USERS.length);
    expect(users[0]!.employeeId).toBe('admin');
    expect(store[USER_ADMIN_STORAGE_KEY]).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('ensureSystemAdminInUserList: admin 행이 없으면 앞에 추가', () => {
    const users: User[] = [
      {
        id: 'u@x.com',
        email: 'u@x.com',
        employeeId: 'U001',
        loginPassword: 'x',
        name: '일반',
        department: '영업1팀',
        isActive: true,
      },
    ];
    const { users: next, changed } = ensureSystemAdminInUserList(users);
    expect(changed).toBe(true);
    expect(next).toHaveLength(2);
    expect(next[0]!.employeeId).toBe('admin');
    expect(next[0]!.loginPassword).toBe('admin');
  });

  it('ensureSystemAdminInUserList: admin 비밀번호가 비어 있으면 기본값으로 채움', () => {
    const users: User[] = [
      {
        id: 'admin@contractos.local',
        email: 'admin@contractos.local',
        employeeId: 'admin',
        loginPassword: '',
        name: '관리자',
        department: '경영지원팀',
        isActive: true,
      },
    ];
    const { users: next, changed } = ensureSystemAdminInUserList(users);
    expect(changed).toBe(true);
    expect(next[0]!.loginPassword).toBe('admin');
  });

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
        id: 'abc@x.com',
        email: 'abc@x.com',
        name: 'A',
        team: '영업3팀',
        isActive: true,
      },
      { email: 'broken' },
    ];
    const out = parseStoredUsers(raw);
    expect(out).toHaveLength(1);
    expect(out[0]!.email).toBe('abc@x.com');
    expect(out[0]!.department).toBe('영업3팀');
    expect(out[0]!.employeeId).toBe('abc');
    expect(out[0]!.loginPassword).toBe('');
  });

  it('serializeUsersForStorage / parse roundtrip', () => {
    const users: User[] = [
      {
        id: 'u@x.com',
        email: 'u@x.com',
        employeeId: 'U001',
        loginPassword: 'secret',
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
