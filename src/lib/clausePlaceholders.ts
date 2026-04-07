/** 조항 본문의 [...] 플레이스홀더(빈칸·변수명) 감지 및 치환 */

export const CLAUSE_PLACEHOLDER_PATTERN = /\[[^\]]*\]/g;

export type ClauseBodySegment =
  | { kind: 'text'; text: string }
  | { kind: 'placeholder'; raw: string };

/** 본문을 읽기 전용 텍스트와 플레이스홀더 토큰으로 분리 (순서 유지) */
export function splitClauseBody(body: string): ClauseBodySegment[] {
  const out: ClauseBodySegment[] = [];
  let last = 0;
  const re = new RegExp(CLAUSE_PLACEHOLDER_PATTERN.source, 'g');
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    if (m.index > last) {
      out.push({ kind: 'text', text: body.slice(last, m.index) });
    }
    out.push({ kind: 'placeholder', raw: m[0] });
    last = m.index + m[0].length;
  }
  if (last < body.length) {
    out.push({ kind: 'text', text: body.slice(last) });
  }
  return out;
}

/** 대괄호 안 문자열(앞뒤 그대로, 공백 포함) */
export function placeholderInner(raw: string): string {
  if (raw.length < 2 || raw[0] !== '[' || raw[raw.length - 1] !== ']') return '';
  return raw.slice(1, -1);
}

export function placeholderAriaLabel(raw: string): string {
  const inner = placeholderInner(raw).trim();
  if (inner === '') return '빈칸 입력';
  return `입력: ${inner}`;
}

/** 빈 값은 문서 관례에 맞춰 [  ]로 저장 */
export function formatPlaceholderContent(inner: string): string {
  return inner === '' ? '[  ]' : `[${inner}]`;
}

/** n번째(0부터) [...] 토큰만 사용자 입력으로 교체 */
export function replaceNthPlaceholder(
  body: string,
  placeholderIndex: number,
  newInnerUnbracketed: string,
): string {
  let i = 0;
  return body.replace(CLAUSE_PLACEHOLDER_PATTERN, (match) => {
    const cur = i++;
    if (cur !== placeholderIndex) return match;
    return formatPlaceholderContent(newInnerUnbracketed);
  });
}

/** 플레이스홀더 개수 */
export function countPlaceholders(body: string): number {
  const m = body.match(CLAUSE_PLACEHOLDER_PATTERN);
  return m?.length ?? 0;
}

/** 빈 줄 2개 이상(\n\n+) 기준으로 단락 분리 (단락 내부 단일 줄바꿈은 유지) */
export function splitBodyIntoParagraphs(body: string): string[] {
  if (body === '') return [''];
  const parts = body.split(/\n{2,}/);
  return parts.length ? parts : [''];
}

export function joinParagraphs(paragraphs: string[]): string {
  return paragraphs.join('\n\n');
}

/**
 * 카드 헤더 제목(마지막 "·" 이후)과 본문 첫 줄이 같으면 읽기/내보내기에서 한 번만 보이도록 첫 줄을 생략합니다.
 * 저장·편집 값은 원문 전체를 유지합니다.
 */
export function stripLeadingTitleFromBodyIfDuplicate(
  body: string,
  title: string,
): string {
  const last = title.split(/\s*·\s*/).pop()?.trim() ?? '';
  if (!last) return body;
  const normalized = body.replace(/\r\n/g, '\n');
  const firstLine = normalized.split('\n')[0]?.trim() ?? '';
  if (firstLine !== last) return body;
  return normalized.split('\n').slice(1).join('\n').replace(/^\n+/, '');
}

/** stripLeadingTitleFromBodyIfDuplicate로 잘린 본문을 플레이스홀더 편집 후 저장용 전문으로 복원합니다. */
export function mergeStrippedClauseBodyWithTitleLine(
  nextStripped: string,
  originalFull: string,
  title: string,
): string {
  const last = title.split(/\s*·\s*/).pop()?.trim() ?? '';
  if (!last) return nextStripped;
  const normalized = originalFull.replace(/\r\n/g, '\n');
  const firstLine = normalized.split('\n')[0]?.trim() ?? '';
  if (firstLine !== last) return nextStripped;
  const t = nextStripped.trim();
  return t === '' ? last : `${last}\n\n${nextStripped}`;
}
