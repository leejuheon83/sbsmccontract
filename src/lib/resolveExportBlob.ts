import type { Clause } from '../types/contract';
import { buildContractDocxBlob } from './exportContractDocx';
import { buildDocxPreservingOriginalFormatting } from './exportDocxWithOriginal';
import type { TemplateRunDefaults } from './templateDocxDefaults';

/**
 * Word보내기 Blob 결정 정책 (순수 함수화된 결정 로직).
 *
 * - `originalDocxBase64`가 있으면 서식 보존 치환(`buildDocxPreservingOriginalFormatting`)을
 *   먼저 시도합니다 (HTML 조항이 있을 때만 의미 있음).
 * - 치환이 불가능하거나 실패하면 **편집 내용이 빠지지 않도록** `buildContractDocxBlob`로
 *   재작성합니다. (레이아웃은 원본과 다를 수 있으나 미리보기·보내기 본문은 조항과 일치)
 * - 원본이 없으면 처음부터 재작성합니다.
 */
export async function resolveExportBlob(params: {
  originalDocxBase64: string | undefined | null;
  hasHtmlClauses: boolean;
  clauses: Clause[];
  reconstruct: {
    documentTitle: string;
    templateLabel: string;
    versionLabel: string;
    templateRunDefaults: TemplateRunDefaults | null;
  };
}): Promise<Blob> {
  const { originalDocxBase64, hasHtmlClauses, clauses, reconstruct } = params;

  if (originalDocxBase64 && hasHtmlClauses) {
    const preserved = await buildDocxPreservingOriginalFormatting({
      originalDocxBase64,
      clauses,
    });
    if (preserved) return preserved;
  }

  return buildContractDocxBlob({
    documentTitle: reconstruct.documentTitle,
    templateLabel: reconstruct.templateLabel,
    versionLabel: reconstruct.versionLabel,
    clauses,
    templateRunDefaults: reconstruct.templateRunDefaults,
  });
}
