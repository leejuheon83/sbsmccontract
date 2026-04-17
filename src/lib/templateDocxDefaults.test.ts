import { describe, expect, it } from 'vitest';
import {
  extractRPrInnerFromStylesXml,
  extractTemplateRunDefaultsFromStylesXml,
} from './templateDocxDefaults';

describe('extractRPrInnerFromStylesXml', () => {
  it('docDefaults의 rPrDefault에서 rPr 추출', () => {
    const xml = `
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:docDefaults>
          <w:rPrDefault>
            <w:rPr>
              <w:rFonts w:ascii="Arial" w:eastAsia="맑은 고딕" w:hAnsi="Arial"/>
              <w:sz w:val="24"/>
            </w:rPr>
          </w:rPrDefault>
        </w:docDefaults>
      </w:styles>`;
    const inner = extractRPrInnerFromStylesXml(xml);
    expect(inner).toContain('맑은 고딕');
    expect(inner).toContain('w:sz');
  });

  it('docDefaults가 없으면 Normal 스타일에서 rPr 추출', () => {
    const xml = `
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:style w:type="paragraph" w:styleId="a1">
          <w:name w:val="Normal"/>
          <w:rPr>
            <w:rFonts w:ascii="Times New Roman" w:eastAsia="바탕"/>
            <w:sz w:val="20"/>
          </w:rPr>
        </w:style>
      </w:styles>`;
    const inner = extractRPrInnerFromStylesXml(xml);
    expect(inner).toContain('바탕');
  });
});

describe('extractTemplateRunDefaultsFromStylesXml', () => {
  it('글꼴·크기 half-points 파싱', () => {
    const xml = `
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:docDefaults>
          <w:rPrDefault>
            <w:rPr>
              <w:rFonts w:ascii="Aptos" w:hAnsi="Aptos" w:eastAsia="맑은 고딕"/>
              <w:sz w:val="22"/>
            </w:rPr>
          </w:rPrDefault>
        </w:docDefaults>
      </w:styles>`;
    const d = extractTemplateRunDefaultsFromStylesXml(xml);
    expect(d).not.toBeNull();
    expect(d!.sizeHalfPoints).toBe(22);
    expect(d!.font).toMatchObject({
      eastAsia: '맑은 고딕',
      ascii: 'Aptos',
      hAnsi: 'Aptos',
    });
  });
});
