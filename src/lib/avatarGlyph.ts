const DIGIT_START = /^[0-9]/;

/**
 * 프로필 배지: 사번 등 숫자로 시작하면 사람 이모지, 그 외는 첫 글자(한글·영문).
 */
export function avatarGlyph(label: string | null | undefined): string {
  const t = label?.trim() ?? '';
  if (!t) return '?';
  const ch = t.charAt(0);
  if (DIGIT_START.test(ch)) return '👤';
  return ch.toUpperCase();
}
