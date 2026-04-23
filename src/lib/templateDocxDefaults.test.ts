import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import {
  extractRPrInnerFromStylesXml,
  extractTemplateRunDefaultsFromDocxBase64,
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

describe('extractTemplateRunDefaultsFromDocxBase64', () => {
  it('document.xml의 첫 입력 필드 run에서 eastAsia 글꼴을 우선 추출', async () => {
    const body =
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:eastAsia="맑은 고딕"/>' +
      '<w:sz w:val="24"/><w:highlight w:val="lightYellow"/></w:rPr><w:t>필드</w:t></w:r>' +
      '</w:p></w:body>';
    const doc =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      body +
      '</w:document>';
    const styles = `<?xml version="1.0" encoding="UTF-8"?>
      <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
        <w:docDefaults><w:rPrDefault><w:rPr>
          <w:rFonts w:ascii="Times" w:hAnsi="Times" w:eastAsia="바탕"/>
          <w:sz w:val="20"/>
        </w:rPr></w:rPrDefault></w:docDefaults>
      </w:styles>`;
    const zip = new JSZip();
    zip.file('word/document.xml', doc);
    zip.file('word/styles.xml', styles);
    const base64 = await zip.generateAsync({ type: 'base64' });
    const d = await extractTemplateRunDefaultsFromDocxBase64(base64);
    expect(d).not.toBeNull();
    expect(d!.sizeHalfPoints).toBe(24);
    expect(d!.font).toMatchObject({ eastAsia: '맑은 고딕' });
  });
});
