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

  it('원본 docx가 있으나 편집 가능 하이라이트가 없으면 재작성으로 조항 편집값을 반영', async () => {
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
    expect(xml).toContain('편집값');
    expect(xml).toContain('템플릿:');
    expect(xml).not.toContain('plain-only');
  });

  it('원본 docx가 있고 clauses에 html 본문이 없으면 재작성으로 평문 조항을 반영', async () => {
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
    expect(xml).toContain('plain text body');
    expect(xml).toContain('템플릿:');
    expect(xml).not.toContain('orig-body');
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
