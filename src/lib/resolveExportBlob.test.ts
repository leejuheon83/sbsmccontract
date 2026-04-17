// @vitest-environment jsdom
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import type { Clause } from '../types/contract';
import { resolveExportBlob } from './resolveExportBlob';

async function zipToDocXml(blob: Blob): Promise<string> {
  const zip = await JSZip.loadAsync(blob);
  const f = zip.file('word/document.xml');
  return f ? await f.async('string') : '';
}

function minimalDocxBase64(
  xmlBodyInner: string,
  extraFiles: Record<string, string> = {},
): Promise<string> {
  const zip = new JSZip();
  zip.file(
    'word/document.xml',
    '<?xml version="1.0" encoding="UTF-8"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body>${xmlBodyInner}</w:body></w:document>`,
  );
  for (const [p, content] of Object.entries(extraFiles)) {
    zip.file(p, content);
  }
  return zip.generateAsync({ type: 'base64' });
}

const RECONSTRUCT = {
  documentTitle: '문서',
  templateLabel: '템플릿',
  versionLabel: 'v1.0',
  templateRunDefaults: null,
};

describe('resolveExportBlob', () => {
  it('원본 docx + 치환 가능한 하이라이트가 있으면 서식 보존 Blob을 반환', async () => {
    const base64 = await minimalDocxBase64(
      '<w:p><w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>간접광고 원본</w:t></w:r></w:p>',
    );
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>간접광고 수정</mark></p>',
      },
    ];
    const blob = await resolveExportBlob({
      originalDocxBase64: base64,
      hasHtmlClauses: true,
      clauses,
      reconstruct: RECONSTRUCT,
    });
    const xml = await zipToDocXml(blob);
    expect(xml).toContain('간접광고 수정');
    expect(xml).not.toContain('원본');
  });

  it('원본 docx가 있으나 편집 가능 하이라이트가 없으면 **원본을 그대로** 반환 (재작성 금지)', async () => {
    /**
     * 편집 가능 run이 없어 치환이 불가능해도 `buildContractDocxBlob`으로 폴백해
     * 임의의 제목/메타/폰트로 재작성되면 원본과 모양이 달라진다. 대신 원본을
     * 그대로 돌려줘 서식을 최우선으로 보존한다.
     */
    const base64 = await minimalDocxBase64(
      '<w:p><w:r><w:t>plain-only</w:t></w:r></w:p>',
    );
    const clauses: Clause[] = [
      {
        num: '§1',
        title: 't',
        state: 'review',
        bodyFormat: 'html',
        body: '<p><mark>편집값</mark></p>',
      },
    ];
    const blob = await resolveExportBlob({
      originalDocxBase64: base64,
      hasHtmlClauses: true,
      clauses,
      reconstruct: RECONSTRUCT,
    });
    const xml = await zipToDocXml(blob);
    // 원본 본문이 그대로 남아야 함
    expect(xml).toContain('plain-only');
    // 재작성 경로의 메타 라인이 들어오면 안 됨
    expect(xml).not.toContain('템플릿:');
    expect(xml).not.toContain('버전 v1.0');
  });

  it('원본 docx가 있고 clauses에 html 본문이 없어도 재작성이 아니라 원본을 그대로 반환', async () => {
    const base64 = await minimalDocxBase64(
      '<w:p><w:r><w:t>orig-body</w:t></w:r></w:p>',
    );
    const clauses: Clause[] = [
      { num: '§1', title: 't', state: 'approved', body: 'plain text body' } as any,
    ];
    const blob = await resolveExportBlob({
      originalDocxBase64: base64,
      hasHtmlClauses: false,
      clauses,
      reconstruct: RECONSTRUCT,
    });
    const xml = await zipToDocXml(blob);
    expect(xml).toContain('orig-body');
    expect(xml).not.toContain('템플릿:');
  });

  it('원본 docx가 없으면 `buildContractDocxBlob`로 재작성해 Blob을 만든다', async () => {
    const clauses: Clause[] = [
      { num: '§1', title: '조항1', state: 'approved', body: '본문1' } as any,
    ];
    const blob = await resolveExportBlob({
      originalDocxBase64: null,
      hasHtmlClauses: false,
      clauses,
      reconstruct: RECONSTRUCT,
    });
    const xml = await zipToDocXml(blob);
    // 재작성 경로에만 존재하는 메타 라인
    expect(xml).toContain('템플릿:');
  });
});
