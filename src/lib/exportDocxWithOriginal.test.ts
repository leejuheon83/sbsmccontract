import { describe, expect, it } from 'vitest';
import type { Clause } from '../types/contract';
import {
  applyHighlightedTextsToWordXml,
  extractEditedHighlightTextsFromClauses,
} from './exportDocxWithOriginal';

describe('extractEditedHighlightTextsFromClauses', () => {
  it('html 조항에서 노란 하이라이트 텍스트를 순서대로 추출', () => {
    const clauses: Clause[] = [
      {
        num: '§1',
        title: '원본',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>첫값</mark> 일반 <span style="background-color: yellow">둘값</span></p>',
      },
    ];
    expect(extractEditedHighlightTextsFromClauses(clauses)).toEqual([
      '첫값',
      '둘값',
    ]);
  });
});

describe('applyHighlightedTextsToWordXml', () => {
  it('연속된 노란 highlight run 세그먼트를 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD1</w:t></w:r>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>_A</w:t></w:r>' +
      '<w:r><w:t>SEP</w:t></w:r>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD2</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['NEW-ONE', 'NEW-TWO']);
    expect(out).toContain('NEW-ONE');
    expect(out).toContain('NEW-TWO');
    expect(out).toContain('<w:t></w:t>');
  });
});
