/** 대시보드 인사 등: `이주헌(관리자)` → `이주헌` */
export function greetingFirstNameFromRegisteredName(name: string): string {
  const base = name.replace(/\s*\([^)]*\)\s*$/u, '').trim();
  return base || name.trim() || '사용자';
}
