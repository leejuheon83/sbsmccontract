import JSZip from 'jszip';
import type { Clause } from '../types/contract';
import { extractEditableHighlightPlainTextsFromClauseHtml } from './richClauseHtml';
import { isWordFormFieldHighlightRun } from './wordFormFieldRun';

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

type RunPart = {
  start: number;
  end: number;
  raw: string;
  /** `wordFormFieldRun` 기준 입력 필드 하이라이트·배경 run */
  isEditableStyle: boolean;
  hasText: boolean;
};

function parseRuns(xml: string): RunPart[] {
  const runRe = /<w:r\b[\s\S]*?<\/w:r>/gi;
  const out: RunPart[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(xml)) !== null) {
    const raw = m[0];
    const isEditableStyle = isWordFormFieldHighlightRun(raw);
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

export function countPatchableRunSegmentsInWordXml(xml: string): number {
  return collectWordSegments(xml).length;
}

/** 디버깅·테스트: Word XML에서 편집 가능 세그먼트별 연결 텍스트 */
export function listPatchableHighlightSegmentTexts(xml: string): string[] {
  const runs = parseRuns(xml);
  const segments = collectWordSegments(xml);
  return segments.map((seg) => {
    let t = '';
    for (let j = seg.segStart; j <= seg.segEnd; j++) {
      t += extractRunTextContent(runs[j]!.raw);
    }
    return t;
  });
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

/** 정규화된 텍스트 (공백·특문 무시 비교용) */
function normalizeForMatch(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\s""\u201C\u201D\u2018\u2019<>\[\]()（）「」『』]+/g, '')
    .toLowerCase();
}

/** 번호 접두어("1. ", "2) " 등)를 제거해 핵심 내용만 비교합니다. */
function stripLeadingNumber(text: string): string {
  return text.replace(/^\d{1,3}\s*[.)）．]\s*/u, '');
}

/** 텍스트가 "1. ", "2) " 등 번호로 시작하는 정의 항목인지 판별합니다. */
function isNumberedItemText(text: string): boolean {
  return /^\d{1,3}\s*[.)）．]\s*\S/u.test(
    text.replace(/\u00a0/g, ' ').trimStart(),
  );
}

/**
 * 연속된 번호 항목(numbered item) 인덱스 그룹을 감지합니다.
 * 예: [6,7,8,9,10] — 5개 항목이 연속으로 "N. ..."으로 시작하는 구간.
 */
function detectNumberedRuns(texts: string[]): number[][] {
  const runs: number[][] = [];
  let current: number[] = [];
  for (let i = 0; i < texts.length; i++) {
    if (isNumberedItemText(texts[i]!)) {
      current.push(i);
    } else {
      if (current.length >= 2) runs.push([...current]);
      current = [];
    }
  }
  if (current.length >= 2) runs.push(current);
  return runs;
}

/**
 * **하이브리드 매칭**: 번호 항목 그룹은 위치 기반, 나머지는 내용 기반, 마지막은 순서 기반.
 *
 * 1단계 — 번호 항목 위치 매칭:
 *   Word 세그먼트와 교체 텍스트에서 연속 번호 항목 그룹을 감지하고,
 *   같은 크기의 그룹끼리 순서대로 1:1 위치 매칭합니다.
 *   → 편집기에서 재배치·재번호한 순서가 그대로 Word에 반영됩니다.
 *
 * 2단계 — 나머지 내용 기반 매칭:
 *   1단계에서 매칭되지 않은 세그먼트와 교체 텍스트를 `LCS / max(길이)`
 *   유사도로 매칭합니다. 길이 불균형 매칭을 방지합니다.
 *
 * 3단계 — 남은 세그먼트 수와 남은 치환값 수가 같으면 문서 순서·추출 순서로 1:1:
 *   플레이스홀더를 완전히 다른 문구로 바꾼 경우 2단계가 매칭하지 못할 수 있어 보완합니다.
 *
 * 4단계 — 1~3단계 후에도 **미매칭 Word 세그먼트 수 > 미매칭 치환값 수**이면,
 *   미매칭 세그먼트 중 **뒤에서부터** 치환값 개수만큼을 HTML 추출 순서와 1:1 대입합니다.
 *   (앞쪽 잉여 노란 run은 원문 유지 — 표·장식용 하이라이트 등)
 */
function matchSegmentsToReplacements(
  segTexts: string[],
  replacements: string[],
): Map<number, string> {
  const result = new Map<number, string>();
  if (replacements.length === 0) return result;

  const usedSeg = new Set<number>();
  const usedRepl = new Set<number>();

  /* ── Phase 1: 번호 항목 그룹 위치 매칭 ── */
  const segRuns = detectNumberedRuns(segTexts);
  const replRuns = detectNumberedRuns(replacements);

  const matchedReplRuns = new Set<number>();
  for (const segRun of segRuns) {
    let bestRri = -1;
    let bestSizeDiff = Infinity;
    for (let rri = 0; rri < replRuns.length; rri++) {
      if (matchedReplRuns.has(rri)) continue;
      const diff = Math.abs(segRun.length - replRuns[rri]!.length);
      if (diff < bestSizeDiff) {
        bestSizeDiff = diff;
        bestRri = rri;
      }
    }
    if (bestRri < 0) continue;
    matchedReplRuns.add(bestRri);
    const replRun = replRuns[bestRri]!;
    const count = Math.min(segRun.length, replRun.length);
    for (let i = 0; i < count; i++) {
      const si = segRun[i]!;
      const ri = replRun[i]!;
      result.set(si, replacements[ri]!);
      usedSeg.add(si);
      usedRepl.add(ri);
    }
  }

  /* ── Phase 2: 나머지 내용 기반 매칭 ── */
  const segNorms = segTexts.map((t) =>
    normalizeForMatch(stripLeadingNumber(t)),
  );
  const replNorms = replacements.map((t) =>
    normalizeForMatch(stripLeadingNumber(t)),
  );

  /**
   * 중복 Word 세그먼트 방어:
   * 동일한 정규화 텍스트를 가진 Word 세그먼트가 2개 이상 있을 때
   * (예: 표 셀 "[프로그램명]" 2개 vs 편집기 1개),
   * 첫 번째 세그먼트가 정확한 매칭 replacement 를 가져간 뒤
   * 두 번째 세그먼트가 유사도가 낮은 엉뚱한 replacement 를 탈취하지 않도록,
   * 이미 매칭에 쓰인 정규화 텍스트와 동일한 세그먼트는 Phase 2 에서 제외합니다.
   */
  const usedSegNorms = new Set<string>();
  for (const [si, _repl] of result) {
    const n = segNorms[si];
    if (n && n.length > 0) usedSegNorms.add(n);
  }

  type Candidate = { si: number; ri: number; score: number };
  const candidates: Candidate[] = [];

  for (let si = 0; si < segNorms.length; si++) {
    if (usedSeg.has(si)) continue;
    const sn = segNorms[si]!;
    if (sn.length === 0) continue;
    // 이미 매칭된 세그먼트와 정규화 텍스트가 동일하면 Phase 2 에서 제외
    // (Word 에 중복 하이라이트가 있지만 편집기에는 하나만 있는 케이스)
    if (usedSegNorms.has(sn)) continue;
    for (let ri = 0; ri < replNorms.length; ri++) {
      if (usedRepl.has(ri)) continue;
      const rn = replNorms[ri]!;
      if (rn.length === 0) continue;
      const overlap = longestCommonSubstringLen(sn, rn);
      const longer = Math.max(sn.length, rn.length);
      const score = longer > 0 ? overlap / longer : 0;
      if (score >= 0.4) {
        candidates.push({ si, ri, score });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  for (const c of candidates) {
    if (usedSeg.has(c.si) || usedRepl.has(c.ri)) continue;
    result.set(c.si, replacements[c.ri]!);
    usedSeg.add(c.si);
    usedRepl.add(c.ri);
    // 새로 매칭된 세그먼트의 정규화 텍스트도 usedSegNorms 에 추가
    const sn = segNorms[c.si];
    if (sn && sn.length > 0) usedSegNorms.add(sn);
  }

  /* ── Phase 3: 플레이스홀더를 전혀 다른 문구로 바꾼 경우 2단계가 전부 스킵될 수 있음.
   * 남은 세그먼트 수 = 남은 치환값 수이면 **문서 순서 × HTML 추출 순서**로 1:1 대입.
   * (원본 OOXML run·rPr는 그대로 두고 w:t 텍스트만 바뀜 → 글꼴 유지)
   */
  const unmatchedSegIdx: number[] = [];
  for (let si = 0; si < segTexts.length; si++) {
    if (!result.has(si)) unmatchedSegIdx.push(si);
  }
  const unmatchedReplIdx: number[] = [];
  for (let ri = 0; ri < replacements.length; ri++) {
    if (!usedRepl.has(ri)) unmatchedReplIdx.push(ri);
  }
  if (
    unmatchedSegIdx.length === unmatchedReplIdx.length &&
    unmatchedSegIdx.length > 0
  ) {
    for (let k = 0; k < unmatchedSegIdx.length; k++) {
      const si = unmatchedSegIdx[k]!;
      const ri = unmatchedReplIdx[k]!;
      result.set(si, replacements[ri]!);
      usedSeg.add(si);
      usedRepl.add(ri);
    }
  }

  /* ── Phase 4: 미매칭 Word 세그먼트만 더 많고, 아직 쓰이지 않은 치환값이 있을 때 접미 정렬 1:1.
   * (이미 result에 있는 세그먼트는 덮어쓰지 않음)
   */
  const unmatchedSegAfter: number[] = [];
  for (let si = 0; si < segTexts.length; si++) {
    if (!result.has(si)) unmatchedSegAfter.push(si);
  }
  const unmatchedReplAfter: number[] = [];
  for (let ri = 0; ri < replacements.length; ri++) {
    if (!usedRepl.has(ri)) unmatchedReplAfter.push(ri);
  }
  if (
    unmatchedSegAfter.length > unmatchedReplAfter.length &&
    unmatchedReplAfter.length > 0
  ) {
    const skip = unmatchedSegAfter.length - unmatchedReplAfter.length;
    for (let k = 0; k < unmatchedReplAfter.length; k++) {
      const si = unmatchedSegAfter[skip + k]!;
      const ri = unmatchedReplAfter[k]!;
      result.set(si, replacements[ri]!);
      usedSeg.add(si);
      usedRepl.add(ri);
    }
  }

  /* ── Phase 5: 동일 원문 세그먼트 전파 ──────────────────────────────────────
   * Word에 동일한 플레이스홀더가 여러 곳(예: 표지 + 본문의 [프로그램명])에
   * 반복될 때, Phase 1~4에서 한 곳이 매칭됐으면 동일 원문(정규화)을 가진
   * 나머지 미매칭 세그먼트에도 같은 치환값을 전파합니다.
   *
   * 이를 통해 "표지 [프로그램명]이 수정 안 되는" 버그를 해결합니다.
   * (Phase 4의 접미 정렬이 표지를 건너뛰어도, Phase 5가 동일 원문으로 찾아 전파)
   */
  const matchedNormToRepl = new Map<string, string>();
  for (const [si, repl] of result) {
    const n = normalizeForMatch(segTexts[si] ?? '');
    if (n.length > 0 && !matchedNormToRepl.has(n)) {
      matchedNormToRepl.set(n, repl);
    }
  }
  for (let si = 0; si < segTexts.length; si++) {
    if (result.has(si)) continue;
    const n = normalizeForMatch(segTexts[si] ?? '');
    if (n.length === 0) continue;
    const propagated = matchedNormToRepl.get(n);
    if (propagated !== undefined) {
      result.set(si, propagated);
    }
  }

  return result;
}

function longestCommonSubstringLen(a: string, b: string): number {
  if (a.length === 0 || b.length === 0) return 0;
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;
  let prev = new Uint16Array(short.length + 1);
  let curr = new Uint16Array(short.length + 1);
  let best = 0;
  for (let i = 1; i <= long.length; i++) {
    for (let j = 1; j <= short.length; j++) {
      if (long[i - 1] === short[j - 1]) {
        curr[j] = prev[j - 1]! + 1;
        if (curr[j]! > best) best = curr[j]!;
      } else {
        curr[j] = 0;
      }
    }
    [prev, curr] = [curr, prev];
    curr.fill(0);
  }
  return best;
}

/**
 * 편집 가능 세그먼트를 하이브리드 매칭으로 교체합니다.
 * - 1·2단계: 번호·내용 유사도 매칭
 * - 3단계: 남은 항목이 개수만 같으면 순서 1:1 (원본 run 서식·글꼴 유지, 텍스트만 교체)
 * - 4단계: 미매칭 Word 세그먼트가 더 많으면 접미 정렬로 남은 치환값만 대입
 * - 빈 값으로 치환된 세그먼트가 속한 문단이 전부 비어 있으면 통째로 제거
 */
export function applyHighlightedTextsToWordXml(
  xml: string,
  replacements: string[],
): string {
  const runs = parseRuns(xml);
  const segments = collectWordSegments(xml);

  const segTexts = segments.map((seg) => {
    let t = '';
    for (let j = seg.segStart; j <= seg.segEnd; j++) {
      t += extractRunTextContent(runs[j]!.raw);
    }
    return t;
  });

  const matchMap = matchSegmentsToReplacements(segTexts, replacements);

  if (import.meta.env?.DEV) {
    console.group(`[applyHighlights] matchMap (${matchMap.size} pairs, segs=${segTexts.length}, repls=${replacements.length})`);
    matchMap.forEach((repl, si) => {
      const orig = segTexts[si] ?? '';
      if (orig !== repl) {
        console.log(`  W${si}: ${JSON.stringify(orig.slice(0, 60))} → ${JSON.stringify(repl.slice(0, 60))}`);
      }
    });
    const unmatchedSegs = segTexts.filter((_, i) => !matchMap.has(i));
    if (unmatchedSegs.length) console.log('  UNMATCHED segs:', unmatchedSegs.map((s) => JSON.stringify(s.slice(0, 40))));
    console.groupEnd();
  }

  const patched = new Map<number, string>();
  segments.forEach((seg, si) => {
    if (!matchMap.has(si)) return;
    const value = matchMap.get(si)!;
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

  let cursor = 0;
  let patchedXml = '';
  runs.forEach((r, idx) => {
    patchedXml += xml.slice(cursor, r.start);
    patchedXml += patched.get(idx) ?? r.raw;
    cursor = r.end;
  });
  patchedXml += xml.slice(cursor);

  /** 빈 값으로 치환된 세그먼트가 속한 문단이 전부 비어 있으면 통째로 제거 */
  const origParagraphs = collectParagraphs(xml);
  if (origParagraphs.length === 0) return patchedXml;

  const emptiedParagraphIndices = new Set<number>();
  segments.forEach((seg, si) => {
    const value = matchMap.get(si);
    if (value === undefined || value !== '') return;
    const segStartOffset = runs[seg.segStart]!.start;
    const pi = origParagraphs.findIndex(
      (p) => p.pStart <= segStartOffset && segStartOffset < p.pEnd,
    );
    if (pi >= 0) emptiedParagraphIndices.add(pi);
  });

  if (emptiedParagraphIndices.size === 0) return patchedXml;

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

  if (import.meta.env?.DEV) {
    console.group('[buildDocx] highlight replacements from clauses');
    console.log('html clauses:', params.clauses.filter((c) => c.bodyFormat === 'html').length);
    replacements.forEach((r, i) => console.log(`  R${i}`, JSON.stringify(r.slice(0, 80))));
    console.groupEnd();
  }

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

    if (import.meta.env?.DEV) {
      const segs = listPatchableHighlightSegmentTexts(xml);
      console.group(`[buildDocx] patching ${path} (${segs.length} segs vs ${replacements.length} repls)`);
      segs.forEach((s, i) => console.log(`  W${i}`, JSON.stringify(s.slice(0, 80))));
      console.groupEnd();
    }

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
