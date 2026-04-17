import JSZip from 'jszip';
import type { Clause } from '../types/contract';
import { extractEditableHighlightPlainTextsFromClauseHtml } from './richClauseHtml';

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function escapeXmlText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeWordFillHex(raw: string): string {
  const h = raw.replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{6}$/.test(h)) return h;
  if (/^[0-9A-F]{3}$/.test(h)) {
    return h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  }
  if (/^[0-9A-F]{8}$/.test(h)) return h.slice(2); // ARGB → RGB
  return h;
}

/**
 * Word `w:shd/@w:fill` hex (no #) — `richClauseHtml`의 연한 노랑·노란 강조와 맞춤.
 */
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
  ].map((s) => normalizeWordFillHex(s)),
);

function extractShdFillFromRunRaw(runRaw: string): string | null {
  const m = runRaw.match(
    /<w:shd\b[^>]*\bw:fill\s*=\s*(["'])([#0-9A-Fa-f]+)\1/i,
  );
  if (!m) return null;
  const hex = m[2]!.replace(/^#/, '');
  if (!/^[0-9A-Fa-f]{3,8}$/i.test(hex)) return null;
  return normalizeWordFillHex(hex);
}

function runHasEditableHighlightOrShade(runRaw: string): boolean {
  if (/<w:highlight\b[^>]*w:val=(["'])yellow\1/i.test(runRaw)) return true;
  const fill = extractShdFillFromRunRaw(runRaw);
  return fill !== null && EDITABLE_WORD_SHD_FILL.has(fill);
}

type RunPart = {
  start: number;
  end: number;
  raw: string;
  /** `w:highlight yellow` 또는 편집기와 동일 팔레트의 `w:shd/@w:fill` */
  isEditableStyle: boolean;
  hasText: boolean;
};

function parseRuns(xml: string): RunPart[] {
  const runRe = /<w:r\b[\s\S]*?<\/w:r>/gi;
  const out: RunPart[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(xml)) !== null) {
    const raw = m[0];
    const isEditableStyle = runHasEditableHighlightOrShade(raw);
    const hasText = /<w:t\b[^>]*>[\s\S]*?<\/w:t>/i.test(raw);
    out.push({
      start: m.index,
      end: m.index + raw.length,
      raw,
      isEditableStyle,
      hasText,
    });
  }
  return out;
}

/**
 * 인접 run 사이에 문단/줄 경계가 있으면 같은 치환 세그먼트로 묶지 않습니다.
 */
function hasWordRunSegmentBoundary(gapXml: string): boolean {
  return /<\/w:p>|<w:br\b|<w:cr\b|<w:tab\b/i.test(gapXml);
}

/** Word run 내 <w:t> 태그들의 텍스트를 추출합니다. */
function extractRunTextContent(runRaw: string): string {
  const texts: string[] = [];
  const re = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(runRaw)) !== null) {
    texts.push(
      (m[1] ?? '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'"),
    );
  }
  return texts.join('');
}

/** 텍스트 앞의 번호(1., 1), 1.) 를 감지해 인접 run의 세그먼트 경계로만 사용합니다. */
function getLeadingItemNumber(text: string): number | null {
  const m = text.replace(/\u00a0/g, ' ').trimStart().match(/^(\d{1,3})\s*[.）)．]/);
  return m ? parseInt(m[1]!, 10) : null;
}

function replaceTextNodesInRun(
  runRaw: string,
  resolveValue: (nodeOrdinal: number) => string,
): string {
  let ordinal = 0;
  return runRaw.replace(
    /<w:t(\b[^>]*)>[\s\S]*?<\/w:t>/gi,
    (_full, attrs: string) => {
      const next = resolveValue(ordinal++);
      return `<w:t${attrs}>${escapeXmlText(next)}</w:t>`;
    },
  );
}

type WordSegment = {
  segStart: number;
  segEnd: number;
};

/**
 * XML에서 편집 가능 세그먼트 목록을 **문서 순서대로** 수집합니다.
 * - 문단/줄 경계(</w:p>, <w:br> 등)에서 세그먼트를 분리합니다.
 * - 번호가 다른 항목이 동일 문단에 인접해 있어도 (예: "2. ..." 바로 뒤에 "3. ...") 별도 세그먼트로 처리합니다.
 */
function collectWordSegments(xml: string): WordSegment[] {
  const runs = parseRuns(xml);
  const segments: WordSegment[] = [];
  let i = 0;

  while (i < runs.length) {
    const run = runs[i]!;
    if (!(run.isEditableStyle && run.hasText)) {
      i++;
      continue;
    }
    const segStart = i;
    let segEnd = i;
    let segLeadNum: number | null = getLeadingItemNumber(
      extractRunTextContent(run.raw),
    );

    while (segEnd + 1 < runs.length) {
      const nextRun = runs[segEnd + 1]!;
      if (!nextRun.isEditableStyle || !nextRun.hasText) break;
      if (hasWordRunSegmentBoundary(xml.slice(runs[segEnd]!.end, nextRun.start))) break;

      const nextText = extractRunTextContent(nextRun.raw);
      const nextLeadNum = getLeadingItemNumber(nextText);
      if (nextLeadNum !== null) {
        if (segLeadNum === null) {
          segLeadNum = nextLeadNum;
        } else if (nextLeadNum !== segLeadNum) {
          break;
        }
      }
      segEnd++;
    }

    segments.push({ segStart, segEnd });
    i = segEnd + 1;
  }

  return segments;
}

function countPatchableRunSegmentsInWordXml(xml: string): number {
  return collectWordSegments(xml).length;
}

type ParagraphRange = { pStart: number; pEnd: number };

/** `<w:p>...</w:p>` 블록의 시작·끝 오프셋 목록을 반환합니다. */
function collectParagraphs(xml: string): ParagraphRange[] {
  const re = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
  const out: ParagraphRange[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    out.push({ pStart: m.index, pEnd: m.index + m[0].length });
  }
  return out;
}

/**
 * 편집 가능 세그먼트를 문서 순서대로 교체합니다 (**위치 기반 매칭**).
 * - i번째 세그먼트 ↔ i번째 교체문자열로 1:1 매칭합니다.
 * - 교체문자열이 비어있는 세그먼트를 포함한 `<w:p>`가, 치환 후 어떤 `<w:t>`에도
 *   본문 텍스트가 남지 않으면 그 문단 전체를 출력에서 제거합니다. (빈 줄 잔존 금지)
 * - 같은 문단에 편집 불가 텍스트("참고:" 같은 일반 run)가 남아 있으면 문단은 유지합니다.
 */
export function applyHighlightedTextsToWordXml(
  xml: string,
  replacements: string[],
): string {
  const runs = parseRuns(xml);
  const segments = collectWordSegments(xml);
  const segmentValues = segments.map((_, i) => replacements[i] ?? '');

  /** run 인덱스 → 치환된 raw */
  const patched = new Map<number, string>();
  segments.forEach((seg, si) => {
    const value = segmentValues[si]!;
    let written = false;
    for (let j = seg.segStart; j <= seg.segEnd; j++) {
      const base = runs[j]!.raw;
      const next = replaceTextNodesInRun(base, (ord) => {
        if (!written && ord === 0) {
          written = true;
          return value;
        }
        return '';
      });
      patched.set(j, next);
    }
  });

  /** 1차: run 수준 치환이 반영된 XML */
  let cursor = 0;
  let patchedXml = '';
  runs.forEach((r, idx) => {
    patchedXml += xml.slice(cursor, r.start);
    patchedXml += patched.get(idx) ?? r.raw;
    cursor = r.end;
  });
  patchedXml += xml.slice(cursor);

  /** 2차: 빈 세그먼트를 포함한 문단이 완전히 비어 있으면 통째로 제거 */
  const origParagraphs = collectParagraphs(xml);
  if (origParagraphs.length === 0) return patchedXml;

  /** 원본 XML 기준으로 "빈 값으로 치환된 세그먼트"를 가진 문단 식별 */
  const emptiedParagraphIndices = new Set<number>();
  segments.forEach((seg, si) => {
    if (segmentValues[si] !== '') return;
    const segStartOffset = runs[seg.segStart]!.start;
    const pi = origParagraphs.findIndex(
      (p) => p.pStart <= segStartOffset && segStartOffset < p.pEnd,
    );
    if (pi >= 0) emptiedParagraphIndices.add(pi);
  });

  if (emptiedParagraphIndices.size === 0) return patchedXml;

  /** 문단 개수가 치환 전/후 동일하다는 전제. 순서·위치는 달라져도 개수는 같다. */
  const patchedParagraphs = collectParagraphs(patchedXml);
  if (patchedParagraphs.length !== origParagraphs.length) return patchedXml;

  const paragraphsToDrop = new Set<number>();
  emptiedParagraphIndices.forEach((pi) => {
    const p = patchedParagraphs[pi]!;
    const pXml = patchedXml.slice(p.pStart, p.pEnd);
    if (extractRunTextContent(pXml).replace(/\s/g, '') === '') {
      paragraphsToDrop.add(pi);
    }
  });

  if (paragraphsToDrop.size === 0) return patchedXml;

  let out = '';
  let cursor2 = 0;
  patchedParagraphs.forEach((p, pi) => {
    if (paragraphsToDrop.has(pi)) {
      out += patchedXml.slice(cursor2, p.pStart);
      cursor2 = p.pEnd;
    }
  });
  out += patchedXml.slice(cursor2);
  return out;
}

export function extractEditedHighlightTextsFromClauses(clauses: Clause[]): string[] {
  const out: string[] = [];
  for (const c of clauses) {
    if (c.bodyFormat !== 'html') continue;
    out.push(...extractEditableHighlightPlainTextsFromClauseHtml(c.body));
  }
  return out;
}

export async function buildDocxPreservingOriginalFormatting(params: {
  originalDocxBase64: string;
  clauses: Clause[];
}): Promise<Blob | null> {
  const replacements = extractEditedHighlightTextsFromClauses(params.clauses);
  if (replacements.length === 0) return null;

  const zip = await JSZip.loadAsync(
    decodeBase64ToUint8Array(params.originalDocxBase64),
  );

  const patchTargets = Object.keys(zip.files).filter((p) =>
    /^word\/(document|header\d+|footer\d+)\.xml$/i.test(p),
  );

  let patchedAny = false;
  for (const path of patchTargets) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    const segCount = countPatchableRunSegmentsInWordXml(xml);
    if (segCount === 0) continue;
    // 번호 기반 매칭이므로 모든 replacements를 넘기고, 함수 내에서 번호로 매칭합니다.
    const patched = applyHighlightedTextsToWordXml(xml, replacements);
    zip.file(path, patched);
    patchedAny = true;
  }

  /**
   * 치환 가능한 run이 하나도 없으면 원본 서식 보존 패치를 할 수 없어 null.
   * (호출부에서 평문 docx 폴백)
   */
  if (!patchedAny) {
    return null;
  }

  /**
   * 일부 치환이 남아도 원본 서식을 최대한 유지하기 위해 패치된 원본을 우선 반환.
   * 남은 항목은 원본의 편집 가능 run 수를 초과한 경우로 간주합니다.
   */

  return zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
