// @vitest-environment jsdom
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { describe, it } from 'vitest';
import {
  listPatchableHighlightSegmentTexts,
  applyHighlightedTextsToWordXml,
} from './exportDocxWithOriginal';
import { extractEditableHighlightPlainTextsFromClauseHtml } from './richClauseHtml';

const DOCX_PATH = join(__dirname, '../../계약서/2026 MC 표준 마케팅 계약서(SBS-MC)_2602.docx');
const DOCX = existsSync(DOCX_PATH) ? readFileSync(DOCX_PATH) : null;

describe.skipIf(!DOCX)('DEBUG: cover page mapping', () => {
  it('print word segments vs editor replacements', async () => {
    const zip = await JSZip.loadAsync(DOCX!);
    const docXml = await zip.file('word/document.xml')!.async('string');
    const segs = listPatchableHighlightSegmentTexts(docXml);
    const { value: html } = await mammoth.convertToHtml(
      { buffer: DOCX! },
      { styleMap: [
        "highlight[color='yellow'] => mark.co-editable-highlight",
        "highlight[color='lightYellow'] => mark.co-editable-highlight",
      ] },
    );
    const repl = extractEditableHighlightPlainTextsFromClauseHtml(html);

    console.log('===== WORD SEGMENTS (' + segs.length + ') =====');
    segs.forEach((s, i) => console.log('W' + i, JSON.stringify(s.slice(0, 100))));
    console.log('\n===== EDITOR REPL (' + repl.length + ') =====');
    repl.forEach((s, i) => console.log('E' + i, JSON.stringify(s.slice(0, 100))));

    // Simulate user editing first '<프로그램명>' -> '<미우새>'
    const editedRepl = repl.map((r) => (r === '<프로그램명>' ? '<미우새>' : r));
    const patched = applyHighlightedTextsToWordXml(docXml, editedRepl);
    const patchedSegs = listPatchableHighlightSegmentTexts(patched);
    console.log('\n===== PATCHED SEGMENTS (프로그램명 흔적) =====');
    patchedSegs.forEach((s, i) => {
      if (s.includes('프로그램명') || s.includes('미우새')) {
        console.log(i, JSON.stringify(s.slice(0, 80)));
      }
    });
  });
});
