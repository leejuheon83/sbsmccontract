import { describe, expect, it } from 'vitest';
import { greetingFirstNameFromRegisteredName } from './userDisplayName';

describe('greetingFirstNameFromRegisteredName', () => {
  it('괄호 접미 제거', () => {
    expect(greetingFirstNameFromRegisteredName('이주헌(관리자)')).toBe('이주헌');
  });
  it('접미 없으면 그대로', () => {
    expect(greetingFirstNameFromRegisteredName('최형경')).toBe('최형경');
  });
});
