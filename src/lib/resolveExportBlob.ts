import JSZip from 'jszip';
import type { Clause } from '../types/contract';
import { buildContractDocxBlob } from './exportContractDocx';
import { buildDocxPreservingOriginalFormatting } from './exportDocxWithOriginal';
import type { TemplateRunDefaults } from './templateDocxDefaults';

function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

/**
 * 원본 docx base64를 그대로 Blob으로 반환합니다.
 * 편집 가능 하이라이트가 하나도 없어 서식 보존 치환이 불가능할 때,
 * `buildContractDocxBlob`(서식을 처음부터 재작성)로 폴백해 원본과 다른 모양이
 * 나오지 않도록, 치환 없이라도 원본 서식을 그대로 보존합니다.
 */
export async function buildPristineOriginalDocxBlob(
  originalDocxBase64: string,
): Promise<Blob> {
  const bytes = decodeBase64ToUint8Array(originalDocxBase64);
  const zip = await JSZip.loadAsync(bytes);
  return zip.generateAsync({ type: 'blob', mimeType: DOCX_MIME });
}

/**
 * Word 내보내기 Blob 결정 정책 (순수 함수화된 결정 로직).
 *
 * - `originalDocxBase64`가 있으면 **절대 재작성(reconstruct) 경로로 가지 않는다**:
 *   1) 서식 보존 치환을 먼저 시도
 *   2) 치환 가능한 run이 없어 null이면 원본 docx를 그대로 반환 (서식 유지 최우선)
 * - `originalDocxBase64`가 없을 때만 `buildContractDocxBlob`로 재작성한다.
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

  if (originalDocxBase64) {
    if (hasHtmlClauses) {
      const preserved = await buildDocxPreservingOriginalFormatting({
        originalDocxBase64,
        clauses,
      });
      if (preserved) return preserved;
    }
    return buildPristineOriginalDocxBlob(originalDocxBase64);
  }

  return buildContractDocxBlob({
    documentTitle: reconstruct.documentTitle,
    templateLabel: reconstruct.templateLabel,
    versionLabel: reconstruct.versionLabel,
    clauses,
    templateRunDefaults: reconstruct.templateRunDefaults,
  });
}
