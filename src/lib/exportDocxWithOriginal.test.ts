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

describe('applyHighlightedTextsToWordXml — 내용 기반 매칭', () => {
  it('연속된 노란 highlight run 세그먼트를 유사 텍스트로 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>1. 간접광고 원본</w:t></w:r>' +
      '<w:r><w:t>SEP</w:t></w:r>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2. 디지털 원본</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, [
      '1. 간접광고 수정',
      '2. 디지털 수정',
    ]);
    expect(out).toContain('1. 간접광고 수정');
    expect(out).toContain('2. 디지털 수정');
    expect(out).not.toContain('원본');
  });

  it('w:highlight lightYellow run 세그먼트를 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:highlight w:val="lightYellow"/></w:rPr><w:t>프로그램명 원본</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['프로그램명 수정']);
    expect(out).toContain('프로그램명 수정');
    expect(out).not.toContain('프로그램명 원본');
  });

  it('연속된 w:shd 연한 노랑 fill run 세그먼트를 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>간접광고 원본</w:t></w:r>' +
      '<w:r><w:t>SEP</w:t></w:r>' +
      '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>디지털 원본</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, [
      '간접광고 수정',
      '디지털 수정',
    ]);
    expect(out).toContain('간접광고 수정');
    expect(out).toContain('디지털 수정');
    expect(out).not.toContain('원본');
  });

  it('문단 경계가 있으면 각각 별도 세그먼트로 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>간접광고 원본</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>디지털 원본</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['간접광고 수정', '디지털 수정']);
    expect(out).toContain('간접광고 수정');
    expect(out).toContain('디지털 수정');
    expect(out).not.toContain('원본');
  });

  it('번호 기반: 인접한 다른 번호 run을 별도 세그먼트로 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body><w:p>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2. 디지털 원본</w:t></w:r>' +
      '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>3. 유튜브 원본</w:t></w:r>' +
      '</w:p></w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['2. 디지털 수정', '3. 유튜브 수정']);
    expect(out).toContain('2. 디지털 수정');
    expect(out).toContain('3. 유튜브 수정');
    expect(out).not.toContain('원본');
  });

  it('Word 노란 세그먼트가 치환값보다 많으면 미매칭 구간만 접미 순서로 치환(Phase 4)', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>추가</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>A</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>B</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['X', 'Y']);
    expect(out).toContain('<w:t>X</w:t>');
    expect(out).toContain('<w:t>Y</w:t>');
    expect(out).toContain('<w:t>추가</w:t>');
    expect(out).not.toContain('<w:t>A</w:t>');
    expect(out).not.toContain('<w:t>B</w:t>');
  });

  it('플레이스홀더를 전혀 다른 문구로 바꿔도 개수가 같으면 순서대로 치환', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>&lt;프로그램명&gt;</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2026. 12</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>대행사법인명</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, [
      '나 혼자 산다',
      '2026. 4',
      '(주)테스트법인',
    ]);
    expect(out).toContain('나 혼자 산다');
    expect(out).toContain('2026. 4');
    expect(out).toContain('(주)테스트법인');
    expect(out).not.toContain('프로그램명');
    expect(out).not.toContain('대행사법인명');
  });

  it('내용 기반: Word에 추가 하이라이트가 있어도 해당 항목만 매칭', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>[프로그램명]</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>1. 간접광고 : 원본텍스트</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2. 디지털 브랜디드 : 원본텍스트</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>SBS-TV 프로그램명</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, [
      '1. 간접광고 : 수정된텍스트',
      '2. 디지털 브랜디드 : 수정된텍스트',
    ]);
    expect(out).toContain('1. 간접광고 : 수정된텍스트');
    expect(out).toContain('2. 디지털 브랜디드 : 수정된텍스트');
    // 매칭 안 된 세그먼트는 원본 유지
    expect(out).toContain('[프로그램명]');
    expect(out).toContain('SBS-TV 프로그램명');
  });

  it('매칭 안 되는 세그먼트는 원본 유지', () => {
    const xml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      '<w:body>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>[프로그램명]</w:t></w:r></w:p>' +
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>1. 간접광고 원본</w:t></w:r></w:p>' +
      '</w:body></w:document>';

    const out = applyHighlightedTextsToWordXml(xml, ['1. 간접광고 수정']);
    expect(out).toContain('1. 간접광고 수정');
    expect(out).toContain('[프로그램명]');
    const pCount = (out.match(/<w:p\b/g) ?? []).length;
    expect(pCount).toBe(2);
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
        '<w:r><w:rPr><w:shd w:val="clear" w:fill="FFF2CC" w:color="auto"/></w:rPr><w:t>간접광고 원본</w:t></w:r>' +
        '</w:p></w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>간접광고 수정문구</mark></p>',
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(blob!);
    const docXml = await outZip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('간접광고 수정문구');
    expect(docXml).not.toContain('원본');
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

  it('여러 조항·여러 하이라이트를 내용 기반으로 올바르게 매칭', async () => {
    const zip = new JSZip();
    zip.file(
      'word/document.xml',
      '<?xml version="1.0" encoding="UTF-8"?>' +
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
        '<w:body>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>[프로그램명]</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>1. 간접광고 원본</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>2. 디지털 원본</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>3. 유튜브 원본</w:t></w:r></w:p>' +
        '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>SBS-TV 방송</w:t></w:r></w:p>' +
        '</w:body></w:document>',
    );
    const base64 = await zip.generateAsync({ type: 'base64' });
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>1. 간접광고 수정</mark></p><p><mark>2. 디지털 수정</mark></p><p><mark>3. 유튜브 수정</mark></p>',
      },
    ];
    const blob = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64: base64,
      clauses,
    });
    expect(blob).not.toBeNull();
    const outZip = await JSZip.loadAsync(blob!);
    const docXml = await outZip.file('word/document.xml')!.async('string');
    expect(docXml).toContain('1. 간접광고 수정');
    expect(docXml).toContain('2. 디지털 수정');
    expect(docXml).toContain('3. 유튜브 수정');
    // 관련 없는 하이라이트는 원본 유지
    expect(docXml).toContain('[프로그램명]');
    expect(docXml).toContain('SBS-TV 방송');
  });
});
