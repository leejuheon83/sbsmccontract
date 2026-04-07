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
