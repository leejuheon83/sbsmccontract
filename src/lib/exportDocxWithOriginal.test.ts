// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { Clause } from '../types/contract';
import {
  applyHighlightedTextsToWordXml,
  buildDocxPreservingOriginalFormatting,
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

  it('여러 html 조항에서 하이라이트를 조항 순서대로 모두 추출', () => {
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 'a',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>A1</mark></p>',
      },
      {
        num: '§2',
        title: 'b',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>B1</mark></p>',
      },
    ];
    expect(extractEditedHighlightTextsFromClauses(clauses)).toEqual(['A1', 'B1']);
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

  it('연속된 w:shd 연한 노랑 fill run 세그먼트를 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>OLD1</w:t></w:r>' +
      '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>_A</w:t></w:r>' +
      '<w:r><w:t>SEP</w:t></w:r>' +
      '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>OLD2</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['NEW-ONE', 'NEW-TWO']);
    expect(out).toContain('NEW-ONE');
    expect(out).toContain('NEW-TWO');
    expect(out).not.toContain('OLD1');
  });

  it('문단 경계가 있으면 각각 별도 세그먼트로 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD1</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD2</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['NEW1', 'NEW2']);
    expect(out).toContain('NEW1');
    expect(out).toContain('NEW2');
    expect(out).not.toContain('OLD1');
    expect(out).not.toContain('OLD2');
  });
});

describe('buildDocxPreservingOriginalFormatting', () => {
  it('원본이 w:shd 연한 노랑만 있어도 편집값으로 치환해 Blob 반환', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p>' +
        '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>OLD</w:t></w:r>' +
        '</w:p></w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>신규문구</mark></p>',
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(blob!);
    const docXml = await outZip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('신규문구');
    expect(docXml).not.toContain('OLD');
  });

  it('원본 XML에 highlight·shd 편집 구간이 없으면 치환 불가로 null', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p><w:r><w:t>plain</w:t></w:r></w:p></w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>편집값</mark></p>',
      },
    ];
    await expect(
      buildDocxPreservingOriginalFormatting({
        originalDocxBase64: base64,
        clauses,
      }),
    ).resolves.toBeNull();
  });

  it('치환 대상이 일부만 있어도 원본 서식 문서를 우선 반환', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body><w:p>' +
        '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD-ONE</w:t></w:r>' +
        '</w:p></w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>첫변경</mark> <mark>둘변경</mark></p>',
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(blob!);
    const docXml = await outZip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('첫변경');
    expect(docXml).not.toContain('OLD-ONE');
  });

  it('번호 기반: 인접한 다른 번호 run을 별도 세그먼트로 치환', async () => {
    // Word XML에서 2번과 3번이 같은 문단에 인접해 있어도 각각 별도 치환
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2. OLD_DIGITAL</w:t></w:r>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>3. OLD_YOUTUBE</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['2. NEW_DIGITAL', '3. NEW_YOUTUBE']);
    expect(out).toContain('2. NEW_DIGITAL');
    expect(out).toContain('3. NEW_YOUTUBE');
    expect(out).not.toContain('OLD_DIGITAL');
    expect(out).not.toContain('OLD_YOUTUBE');
  });

  it('위치 기반: HTML 추출 순서(=문서 순서)가 Word 문단 순서와 동일하게 매칭', async () => {
    /**
     * 실제 흐름: `extractEditableHighlightPlainTextsFromClauseHtml`은
     * DOM `querySelectorAll` 결과를 그대로 사용하므로 HTML의 추출 순서는
     * 언제나 **문서 순서**와 같다. Word XML도 동일한 문서 순서이므로
     * i번째 세그먼트 ↔ i번째 교체문으로 1:1 매칭한다.
     */
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>5. 간접광고 원본</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2. 디지털 원본</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>3. 유튜브 원본</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, [
      '5. 간접광고 수정',
      '2. 디지털 수정',
      '3. 유튜브 수정',
    ]);
    expect(out).toContain('5. 간접광고 수정');
    expect(out).toContain('2. 디지털 수정');
    expect(out).toContain('3. 유튜브 수정');
    expect(out).not.toContain('원본');
  });

  it('치환값이 빈 세그먼트의 문단은 결과 XML에서 통째로 제거된다', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD1</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD2</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD3</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['NEW1', 'NEW2']);
    expect(out).toContain('NEW1');
    expect(out).toContain('NEW2');
    expect(out).not.toContain('OLD3');
    // 세그먼트가 단독이던 3번째 <w:p>는 완전히 제거되어야 함 (빈 문단 잔존 금지)
    const pCount = (out.match(/<w:p\b/g) ?? []).length;
    expect(pCount).toBe(2);
  });

  it('문단에 편집 불가 텍스트가 섞여 있으면 문단은 보존되고 run만 비워진다', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p>' +
      '<w:r><w:t>참고: </w:t></w:r>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD</w:t></w:r>' +
      '</w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['']);
    // 편집 불가 "참고: "가 남아 있으므로 문단 자체는 유지되어야 함
    expect(out).toContain('참고: ');
    expect(out).not.toContain('OLD');
    const pCount = (out.match(/<w:p\b/g) ?? []).length;
    expect(pCount).toBe(1);
  });

  it('교체문보다 Word 세그먼트가 많으면 남은 세그먼트의 문단이 완전히 제거된다', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD1</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD2</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD3</w:t></w:r></w:p>' +
        '</w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    // 3개 중 2개만 선택 → 교체문이 2개
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>NEW1</mark></p><p><mark>NEW2</mark></p>',
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(blob!);
    const docXml = await outZip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('NEW1');
    expect(docXml).toContain('NEW2');
    expect(docXml).not.toContain('OLD1');
    expect(docXml).not.toContain('OLD2');
    expect(docXml).not.toContain('OLD3');
    // 빈 문단이 남지 않고 문단 개수가 2로 줄어야 함
    const pCount = (docXml.match(/<w:p\b/g) ?? []).length;
    expect(pCount).toBe(2);
  });

  it('문단별 하이라이트 문항이 여러 개면 모두 치환', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD1</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD2</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>OLD3</w:t></w:r></w:p>' +
        '</w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>ONE</mark></p><p><mark>TWO</mark></p><p><mark>THREE</mark></p>',
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(blob!);
    const docXml = await outZip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('ONE');
    expect(docXml).toContain('TWO');
    expect(docXml).toContain('THREE');
  });
});
