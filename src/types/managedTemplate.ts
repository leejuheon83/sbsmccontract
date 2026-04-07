/** 템플릿 관리 화면(그리드 카드)용 항목 — 표준 TEMPLATES 매트릭스와 별도 UI 목록 */

import type {
  Clause,
  ContractDocType,
  ContractFormType,
  Genre,
} from './contract';

export type TemplateTone = 'primary' | 'info' | 'success' | 'warning' | 'neutral';

export type ManagedTemplateStatus = 'active' | 'discarded';

export interface TemplateAttachment {
  fileName: string;
  size: number;
  mimeType: string;
  /** UTF-8 텍스트로 읽은 경우(plain/html/md 등) */
  textContent?: string;
  /** docx에서 추출한 HTML (표 포함) */
  htmlContent?: string;
  /** 원본 docx 바이너리(base64) — 서식 보존 내보내기용 */
  originalDocxBase64?: string;
}

export interface TemplateListItem {
  id: string;
  name: string;
  clauseCount: number;
  formFieldCount: number;
  ver: string;
  tone: TemplateTone;
  status: ManagedTemplateStatus;
  /** 업로드한 계약서 파일 메타·본문(텍스트만) */
  attachment?: TemplateAttachment;
  /** 편집기에서 저장한 조항 초안 */
  clauses?: Clause[];
  /**
   * true: 편집기 저장본(clauses)이 업로드 텍스트보다 우선.
   * false/미지정: UTF-8로 읽은 업로드 본문(attachment.textContent)이 있으면 항상 그걸로 조항을 나눔.
   */
  clausesAuthoritative?: boolean;
  /** ③ 계약서 유형 선택 시 표준 매트릭스 대신(또는 함께) 이 관리 템플릿 조항을 불러올 때 */
  linkedDocType?: ContractDocType;
  /** 동일 계약서유형이라도 계약형태(2자/위수탁/언진원)를 한정하고 싶을 때 */
  linkedFormType?: ContractFormType;
  /** 같은 유형이 여러 장르에 있을 때 우선 적용 (미지정이면 유형만 맞으면 적용) */
  linkedGenre?: Genre;
}
