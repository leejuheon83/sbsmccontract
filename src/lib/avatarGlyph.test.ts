import { describe, expect, it } from 'vitest';
import { avatarGlyph } from './avatarGlyph';

describe('avatarGlyph', () => {
  it('숫자로 시작하면 사람 이모지', () => {
    expect(avatarGlyph('170002')).toBe('👤');
    expect(avatarGlyph('admin')).toBe('A');
  });
  it('한글 이름은 첫 글자', () => {
    expect(avatarGlyph('이주헌')).toBe('이');
  });
  it('빈 값', () => {
    expect(avatarGlyph('')).toBe('?');
    expect(avatarGlyph(null)).toBe('?');
  });
});
