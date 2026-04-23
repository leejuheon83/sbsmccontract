// @vitest-environment jsdom
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { describe, expect, it } from 'vitest';
import {
  buildDocxPreservingOriginalFormatting,
  countPatchableRunSegmentsInWordXml,
  extractEditedHighlightTextsFromClauses,
  listPatchableHighlightSegmentTexts,
} from './exportDocxWithOriginal';
import type { Clause } from '../types/contract';

const DOCX_PATH = join(
  __dirname,
  '../../계약서/2026 MC 표준 마케팅 계약서(SBS-MC)_2602.docx',
);

const DOCX = existsSync(DOCX_PATH) ? readFileSync(DOCX_PATH) : null;

/** jsdom 등에서 Blob.arrayBuffer가 없을 때 FileReader로 읽음 */
async function exportBlobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  const b = blob as Blob & { arrayBuffer?: () => Promise<ArrayBuffer> };
  if (typeof b.arrayBuffer === 'function') return b.arrayBuffer();
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as ArrayBuffer);
    fr.onerror = () => reject(fr.error ?? new Error('FileReader failed'));
    fr.readAsArrayBuffer(blob);
  });
}

describe.skipIf(!DOCX)('실제 MC docx — Word 세그먼트 vs HTML 하이라이트', () => {
  it('document.xml 노란 세그먼트 수와 mammoth HTML 하이라이트 개수를 맞춘다', async () => {
    const zip = await JSZip.loadAsync(DOCX!);
    const docXml = await zip.file('word/document.xml')!.async('string');
    const segs = listPatchableHighlightSegmentTexts(docXml);
    const { value: html } = await mammoth.convertToHtml(
      { buffer: DOCX! },
      {
        styleMap: [
          "highlight[color='yellow'] => mark.co-editable-highlight",
          "highlight[color='lightYellow'] => mark.co-editable-highlight",
        ],
      },
    );
    const clauses: Clause[] = [
      {
        num: '§1',
        title: '원본 서식(표 포함)',
        state: 'review',
        bodyFormat: 'html',
        body: html,
      },
    ];
    const repl = extractEditedHighlightTextsFromClauses(clauses);
    expect(repl.length).toBeGreaterThan(0);
    expect(repl.length).toBeLessThanOrEqual(segs.length);
  });

  it('첫 필드만 바꿔도 document.xml에 반영', async () => {
    const base64 = DOCX!.toString('base64');
    const zip = await JSZip.loadAsync(DOCX!);
    const docXml = await zip.file('word/document.xml')!.async('string');
    countPatchableRunSegmentsInWordXml(docXml);
    const { value: html } = await mammoth.convertToHtml(
      { buffer: DOCX! },
      {
        styleMap: [
          "highlight[color='yellow'] => mark.co-editable-highlight",
          "highlight[color='lightYellow'] => mark.co-editable-highlight",
        ],
      },
    );
    const repl = extractEditedHighlightTextsFromClauses([
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: html,
      },
    ]);
    expect(repl.length).toBeGreaterThan(0);
    const nextRepl = [...repl];
    nextRepl[0] = '___UNIT_TEST_REPLACEMENT___';
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: html.replace(repl[0]!, nextRepl[0]!),
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(await exportBlobToArrayBuffer(blob!));
    const outXml = await outZip.file('word/document.xml')!.async('string');
    expect(outXml).toContain('___UNIT_TEST_REPLACEMENT___');
  });
});
