/**
 * Word OOXML에서 "노란 입력란" 형태의 run인지 판별합니다.
 * 편집기·보내기(`exportDocxWithOriginal`)·템플릿 기본 글꼴 추출에서 공통 사용합니다.
 */

export function normalizeWordFillHex(raw: string): string {
  const h = raw.replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(h)) return h;
  if (/^[0-9A-F]{3}$/.test(h)) {
    return h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }
  if (/^[0-9A-F]{8}$/.test(h)) return h.slice(2);
  return h;
}

function extractShdFillFromRunRaw(runRaw: string): string | null {
  const m = runRaw.match(
    /<w:shd\b[^>]*\bw:fill\s*=\s*(["'])([#0-9A-Fa-f]+)\1/i,
  );
  if (!m) return null;
  const hex = m[2]!.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{3,8}$/i.test(hex)) return null;
  return normalizeWordFillHex(hex);
}

/** Word 본문·표에서 자주 쓰이는 연한 노랑/앰버 배경 (w:shd fill) */
const EDITABLE_WORD_SHD_FILL = new Set(
  [
    'FFF2CC',
    'FEF08A',
    'FDE68A',
    'FEF3C7',
    'FFF9C4',
    'FFFF99',
    'FFFF00',
    'FFFFFF00',
    'FF0',
    'FFC000',
    'FFFACD',
    'FFECB3',
    'FFF9E6',
    'FFE0B2',
    'FFCC80',
    'FFF59D',
    'FFF176',
    'FFE082',
    'FFEB9C',
    'FFFDE7',
    'FFF8E1',
    'FEF9C3',
    'FCE4B8',
  ].map((s) => normalizeWordFillHex(s)),
);

/**
 * 계약서 입력 필드로 간주되는 하이라이트/배경 run.
 * - `w:highlight` yellow / lightYellow (및 w14 접두)
 * - 편집기와 맞춘 연한 노랑 `w:shd/@w:fill` 팔레트
 */
export function isWordFormFieldHighlightRun(runRaw: string): boolean {
  const highlightM = runRaw.match(
    /<(?:w14:|w:)highlight\b[^>]*\bw:val\s*=\s*(["'])([^"']*)\1/i,
  );
  if (highlightM) {
    const v = (highlightM[2] ?? '').toLowerCase().trim();
    if (!v || v === 'none' || v === 'clear') return false;
    if (v === 'yellow' || v === 'lightyellow') return true;
  }
  const fill = extractShdFillFromRunRaw(runRaw);
  return fill !== null && EDITABLE_WORD_SHD_FILL.has(fill);
}
