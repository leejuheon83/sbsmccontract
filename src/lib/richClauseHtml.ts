export function sanitizeClauseHtml(html: string): string {
  let out = html;
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '');
  out = out.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '');
  out = out.replace(/\son\w+="[^"]*"/gi, '');
  out = out.replace(/\son\w+='[^']*'/gi, '');
  out = out.replace(/\sjavascript:/gi, ' ');
  return out.trim();
}

function hasYellowHighlight(el: HTMLElement): boolean {
  const style = (el.getAttribute('style') ?? '').toLowerCase();
  const cls = (el.getAttribute('class') ?? '').toLowerCase();
  if (el.tagName.toLowerCase() === 'mark') return true;
  if (/(^|;)\s*mso-highlight\s*:\s*yellow\b/.test(style)) return true;
  if (
    /(^|;)\s*background(?:-color)?\s*:\s*(yellow|#ff0\b|#ffff00\b|rgb\(\s*255\s*,\s*255\s*,\s*0\s*\))/.test(
      style,
    )
  ) {
    return true;
  }
  if (
    cls.includes('highlight-yellow') ||
    cls.includes('yellow-highlight') ||
    cls.includes('hl-yellow')
  ) {
    return true;
  }
  return false;
}

export function markYellowHighlightsEditable(html: string): string {
  const safe = sanitizeClauseHtml(html);
  if (typeof DOMParser === 'undefined') {
    const markDecorated = safe.replace(
      /<mark(\s|>)/gi,
      '<mark data-editable-highlight="1" class="co-editable-highlight"$1',
    );
    return markDecorated.replace(
      /<([a-z0-9]+)([^>]*\bstyle\s*=\s*["'][^"']*(?:mso-highlight\s*:\s*yellow|background(?:-color)?\s*:\s*(?:yellow|#ff0\b|#ffff00\b|rgb\(\s*255\s*,\s*255\s*,\s*0\s*\)))[^"']*["'][^>]*)>/gi,
      '<$1$2 data-editable-highlight="1" class="co-editable-highlight">',
    );
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${safe}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return safe;

  root.querySelectorAll('*').forEach((node) => {
    const el = node as HTMLElement;
    if (!hasYellowHighlight(el)) return;
    el.setAttribute('data-editable-highlight', '1');
    el.classList.add('co-editable-highlight');
  });
  return root.innerHTML;
}

/** 편집기에서 노란 하이라이트(우측 컬럼) 모드인지 판별 */
export function countYellowEditableHighlightsInHtml(html: string): number {
  const marked = markYellowHighlightsEditable(html);
  if (typeof DOMParser === 'undefined') {
    const m = marked.match(/data-editable-highlight=(?:"1"|'1')/gi);
    return m?.length ?? 0;
  }
  const doc = new DOMParser().parseFromString(`<div>${marked}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return 0;
  return root.querySelectorAll('[data-editable-highlight="1"]').length;
}

/**
 * Word 원본 docx의 노란 highlight 치환용.
 * `markYellowHighlightsEditable`과 동일한 기준·순서로 편집 가능 하이라이트 안의 평문을 뽑습니다.
 */
export function extractEditableHighlightPlainTextsFromClauseHtml(
  html: string,
): string[] {
  if (typeof DOMParser === 'undefined') return [];
  const safe = sanitizeClauseHtml(html);
  const marked = markYellowHighlightsEditable(safe);
  const doc = new DOMParser().parseFromString(`<div>${marked}</div>`, 'text/html');
  const root = doc.body.firstElementChild as HTMLElement | null;
  if (!root) return [];
  return Array.from(root.querySelectorAll('[data-editable-highlight="1"]'))
    .map((el) =>
      (el as HTMLElement).textContent?.replace(/\u00a0/g, ' ').trim() ?? '',
    )
    .filter((t) => t.length > 0);
}

export function stripEditableHighlightMarkers(html: string): string {
  const noData = html
    .replace(/\sdata-editable-highlight=(?:"1"|'1')/gi, '')
    .replace(/\sdata-highlight-id=(?:"[^"]*"|'[^']*')/gi, '')
    .replace(/\sdata-editable-highlight/gi, '')
    .replace(/\scontenteditable=(?:"true"|'true'|true)/gi, '')
    .replace(/\stabindex=(?:"0"|'0'|0)/gi, '');

  const stripClassToken = (raw: string): string => {
    const tokens = raw
      .split(/\s+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && t.toLowerCase() !== 'co-editable-highlight');
    return tokens.join(' ');
  };

  const noClass1 = noData.replace(/\sclass="([^"]*)"/gi, (_m, cls: string) => {
    const next = stripClassToken(cls);
    return next ? ` class="${next}"` : '';
  });
  return noClass1.replace(/\sclass='([^']*)'/gi, (_m, cls: string) => {
    const next = stripClassToken(cls);
    return next ? ` class='${next}'` : '';
  });
}

/** Word·편집기에서 흔한 연한 노랑/앰버 박스(패키지 정의 등) */
export function hasPackBoxAppearance(el: HTMLElement): boolean {
  if (hasYellowHighlight(el)) return true;
  const style = (el.getAttribute('style') ?? '').toLowerCase();
  if (
    /background(?:-color)?\s*:\s*#(fff2cc|fef08a|fde68a|fef3c7|fff9c4|ffff99)\b/.test(
      style,
    )
  ) {
    return true;
  }
  if (
    /background(?:-color)?\s*:\s*rgb\(\s*255\s*,\s*242\s*,\s*204\s*\)/.test(style)
  ) {
    return true;
  }
  if (/border[^:]*:\s*[^;]*#ffc000\b/.test(style)) return true;
  const cls = (el.getAttribute('class') ?? '').toLowerCase();
  if (cls.includes('co-selectable-pack')) return true;
  return false;
}

function nodeDepthWithin(el: HTMLElement, ancestor: HTMLElement): number {
  let d = 0;
  for (
    let n: HTMLElement | null = el;
    n && n !== ancestor;
    n = n.parentElement
  ) {
    d += 1;
  }
  return d;
}

/**
 * 조항 HTML에서 패키지·정의 박스로 보이는 블록에 클릭 선택용 마커를 붙입니다.
 * 편집 화면에서만 사용하며, 원문 clause.body에는 저장하지 않습니다.
 */
export function injectSelectablePackMarkers(html: string): string {
  const safe = sanitizeClauseHtml(html);
  if (typeof DOMParser === 'undefined') return safe;
  const parser = new DOMParser();
  const doc = parser.parseFromString('<body></body>', 'text/html');
  const root = doc.createElement('div');
  root.id = 'co-pack-root';
  root.innerHTML = safe;
  doc.body.appendChild(root);

  const candidates = [...root.querySelectorAll('*')].filter(
    (n): n is HTMLElement =>
      n instanceof HTMLElement && hasPackBoxAppearance(n),
  );
  candidates.sort(
    (a, b) => nodeDepthWithin(b, root) - nodeDepthWithin(a, root),
  );

  let idx = 0;
  for (const el of candidates) {
    if (el.hasAttribute('data-co-pack-id')) continue;
    if (el.querySelector('[data-co-pack-id]')) continue;
    el.setAttribute('data-co-pack-id', String(idx));
    el.classList.add('co-selectable-pack');
    const badge = doc.createElement('span');
    badge.className = 'co-pack-order-num';
    badge.setAttribute('aria-hidden', 'true');
    el.insertBefore(badge, el.firstChild);
    idx += 1;
  }

  return root.innerHTML;
}

export function countSelectablePackMarkers(html: string): number {
  const marked = injectSelectablePackMarkers(html);
  const m = marked.match(/\sdata-co-pack-id=/g);
  return m?.length ?? 0;
}

export function htmlClauseToPlainText(html: string): string {
  const safe = sanitizeClauseHtml(html)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/t[dh]>/gi, '\t');
  const noTags = safe.replace(/<[^>]+>/g, '');
  return noTags
    .replace(/\t+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();
}
