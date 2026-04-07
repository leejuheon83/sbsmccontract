import JSZip from 'jszip';
import type { Clause } from '../types/contract';

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
  isYellow: boolean;
  hasText: boolean;
};

function parseRuns(xml: string): RunPart[] {
  const runRe = /<w:r\b[\s\S]*?<\/w:r>/gi;
  const out: RunPart[] = [];
  let m: RegExpExecArray | null;
  while ((m = runRe.exec(xml)) !== null) {
    const raw = m[0];
    const isYellow = /<w:highlight\b[^>]*w:val=(["'])yellow\1/i.test(raw);
    const hasText = /<w:t\b[^>]*>[\s\S]*?<\/w:t>/i.test(raw);
    out.push({
      start: m.index,
      end: m.index + raw.length,
      raw,
      isYellow,
      hasText,
    });
  }
  return out;
}

function countYellowHighlightSegmentsInWordXml(xml: string): number {
  const runs = parseRuns(xml);
  let segments = 0;
  let inSeg = false;
  for (const r of runs) {
    if (r.isYellow && r.hasText) {
      if (!inSeg) segments += 1;
      inSeg = true;
    } else {
      inSeg = false;
    }
  }
  return segments;
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

export function applyHighlightedTextsToWordXml(
  xml: string,
  replacements: string[],
): string {
  const runs = parseRuns(xml);
  const patched = new Map<number, string>();
  let repIdx = 0;
  let i = 0;

  while (i < runs.length && repIdx < replacements.length) {
    const run = runs[i]!;
    if (!(run.isYellow && run.hasText)) {
      i += 1;
      continue;
    }
    const segStart = i;
    let segEnd = i;
    while (
      segEnd + 1 < runs.length &&
      runs[segEnd + 1]!.isYellow &&
      runs[segEnd + 1]!.hasText
    ) {
      segEnd += 1;
    }

    const value = replacements[repIdx++] ?? '';
    let written = false;
    for (let j = segStart; j <= segEnd; j++) {
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
    i = segEnd + 1;
  }

  let cursor = 0;
  let out = '';
  runs.forEach((r, idx) => {
    out += xml.slice(cursor, r.start);
    out += patched.get(idx) ?? r.raw;
    cursor = r.end;
  });
  out += xml.slice(cursor);
  return out;
}

export function extractEditedHighlightTextsFromClauses(clauses: Clause[]): string[] {
  const out: string[] = [];
  const highlightRe =
    /<mark\b[^>]*>([\s\S]*?)<\/mark>|<(?:span|font)\b[^>]*style=(["'])[\s\S]*?(?:mso-highlight\s*:\s*yellow|background(?:-color)?\s*:\s*yellow)[\s\S]*?\2[^>]*>([\s\S]*?)<\/(?:span|font)>/gi;

  const cleanup = (s: string): string =>
    s
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .trim();

  for (const c of clauses) {
    if (c.bodyFormat !== 'html') continue;
    let m: RegExpExecArray | null;
    while ((m = highlightRe.exec(c.body)) !== null) {
      const captured = (m[1] ?? m[3] ?? '').trim();
      const text = cleanup(captured);
      if (text.length > 0) out.push(text);
    }
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

  let remaining = replacements.slice();
  for (const path of patchTargets) {
    const file = zip.file(path);
    if (!file) continue;
    const xml = await file.async('string');
    const segCount = countYellowHighlightSegmentsInWordXml(xml);
    if (segCount === 0) continue;
    const scoped = remaining.slice(0, segCount);
    const patched = applyHighlightedTextsToWordXml(xml, scoped);
    zip.file(path, patched);
    remaining = remaining.slice(segCount);
    if (remaining.length === 0) break;
  }

  return zip.generateAsync({
    type: 'blob',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}
