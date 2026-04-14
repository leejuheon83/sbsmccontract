import { hasPackBoxAppearance, sanitizeClauseHtml } from './richClauseHtml';

export type PackClauseSegment =
  | { type: 'static'; html: string }
  | { type: 'pack'; packIndex: number; html: string };

function getNormalizedBlockChildren(wrap: HTMLElement): HTMLElement[] {
  let children = [...wrap.children] as HTMLElement[];
  if (children.length === 1 && children[0].tagName === 'DIV') {
    const inner = [...children[0].children] as HTMLElement[];
    if (inner.length > 0) children = inner;
  }
  return children;
}

/**
 * HTML 조항을 정적 블록과 노란 박스(번호 정의) 블록으로 나눕니다.
 * 노란 박스가 하나도 없으면 null.
 */
export function parsePackClauseSegments(html: string): {
  segments: PackClauseSegment[];
  packCount: number;
} | null {
  if (typeof DOMParser === 'undefined') return null;
  const safe = sanitizeClauseHtml(html);
  const doc = new DOMParser().parseFromString('<body></body>', 'text/html');
  const wrap = doc.createElement('div');
  wrap.innerHTML = safe;
  doc.body.appendChild(wrap);
  const children = getNormalizedBlockChildren(wrap);
  if (children.length === 0) return null;

  const segments: PackClauseSegment[] = [];
  let packIndex = 0;
  for (const el of children) {
    if (hasPackBoxAppearance(el)) {
      segments.push({
        type: 'pack',
        packIndex: packIndex++,
        html: el.outerHTML,
      });
    } else {
      segments.push({ type: 'static', html: el.outerHTML });
    }
  }
  if (packIndex === 0) return null;
  return { segments, packCount: packIndex };
}

/** 본문 앞의 `1.` / `1)` 형태 번호를 제거한 뒤 새 번호를 붙입니다. */
export function renumberPackOuterHtml(outerHtml: string, newNum: number): string {
  if (typeof DOMParser === 'undefined') return outerHtml;
  const doc = new DOMParser().parseFromString('<body></body>', 'text/html');
  const holder = doc.createElement('div');
  holder.innerHTML = outerHtml.trim();
  const el = holder.firstElementChild as HTMLElement | null;
  if (!el) return outerHtml;
  let inner = el.innerHTML.trim();
  inner = inner
    .replace(/^\s*(?:<span[^>]*>\s*)?\d+\s*[.)]\s*(?:<\/span>\s*)?/iu, '')
    .replace(/^\s*\d+\s*[.)]\s*/u, '')
    .trim();
  el.innerHTML = `${newNum}. ${inner}`;
  return el.outerHTML;
}

/**
 * 연속된 pack 구간마다, orderedPackIndices 순서·선택만 반영해 다시 이어 붙입니다.
 * (정적 블록은 그대로 유지)
 */
export function rebuildHtmlWithPackSelection(
  segments: PackClauseSegment[],
  orderedPackIndices: number[],
): string {
  const packByIdx = new Map<number, string>();
  for (const s of segments) {
    if (s.type === 'pack') packByIdx.set(s.packIndex, s.html);
  }

  const parts: string[] = [];
  let buf: PackClauseSegment[] = [];

  const flushPacks = () => {
    if (buf.length === 0) return;
    let n = 0;
    for (const idx of orderedPackIndices) {
      const html = packByIdx.get(idx);
      if (!html || !buf.some((b) => b.type === 'pack' && b.packIndex === idx)) {
        continue;
      }
      n += 1;
      parts.push(renumberPackOuterHtml(html, n));
    }
    buf = [];
  };

  for (const seg of segments) {
    if (seg.type === 'static') {
      flushPacks();
      parts.push(seg.html);
    } else {
      buf.push(seg);
    }
  }
  flushPacks();
  return parts.join('');
}

export function hasPackClauseSegments(html: string): boolean {
  return parsePackClauseSegments(html) != null;
}
