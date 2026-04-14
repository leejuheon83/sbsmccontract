// src/types/contract.ts
// ContractOS 핵심 타입 정의

// ─────────────────────────────────────────
// 역할 (Role)
// ─────────────────────────────────────────
export type Role = 'sales' | 'legal' | 'admin';

// ─────────────────────────────────────────
// 장르 / 계약형태 / 계약서유형
// ─────────────────────────────────────────
export type Genre = '교양' | '예능' | '드라마';

export type ContractFormType =
  | '2자계약'
  | '위수탁 계약'
  | '언진원 계약';

export type ContractDocType =
  | '협찬 계약서'
  | '마케팅 라이선스'
  | '대행 계약서'
  | '정부 계약서';

// ─────────────────────────────────────────
// 조항 (Clause)
// ─────────────────────────────────────────
export type ClauseState = 'approved' | 'review' | 'ai';

export interface Clause {
  num: string;        // "§1"
  title: string;
  state: ClauseState;
  body: string;       // [  ] 플레이스홀더 포함 가능
  /** 기본 text, 표 유지 편집은 html */
  bodyFormat?: 'text' | 'html';
}

// ─────────────────────────────────────────
// AI 추천 조항
// ─────────────────────────────────────────
export interface AiSuggestion {
  title: string;
  reason: string;   // "📎 근거: ..."
  body: string;
}

// ─────────────────────────────────────────
// 계약서 템플릿
// ─────────────────────────────────────────
export interface ContractTemplate {
  label: string;        // "교양 2자 협찬 계약서"
  ver: string;          // "v2.3"
  tags: string[];       // ["SBS-광고주/대행사"]
  color: string;        // CSS class: "db-협찬"
  iconBg: string;       // "#DBEAFE"
  iconStroke: string;   // "#1E40AF"
  aiSuggest: AiSuggestion;
  clauses: Clause[];
}

// TEMPLATES[장르][계약형태][계약서유형] = ContractTemplate
export type TemplateMap = {
  [genre in Genre]?: {
    [formType in ContractFormType]?: {
      [docType in ContractDocType]?: ContractTemplate;
    };
  };
};

// ─────────────────────────────────────────
// 계약서 문서 (저장된 계약서)
// ─────────────────────────────────────────
export type ContractStatus =
  | 'draft'
  | 'in_review'
  | 'reviewed'
  | 'finalized'
  | 'rejected'
  | 'archived';

export interface Contract {
  id: string;
  title: string;
  genre: Genre;
  formType: ContractFormType;
  docType: ContractDocType;
  templateLabel: string;
  status: ContractStatus;
  version: string;
  clauses: Clause[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ─────────────────────────────────────────
// 버전 이력
// ─────────────────────────────────────────
export interface VersionEntry {
  ver: string;
  author: string;
  timestamp: string;
  description: string;
  clauses: Clause[];
}

// ─────────────────────────────────────────
// 감사 로그
// ─────────────────────────────────────────
export type AuditActionType =
  | 'load'
  | 'edit'
  | 'save'
  | 'ai_accept'
  | 'ai_reject'
  | 'export'
  | 'review_complete'
  | 'review_reject';

export interface AuditEntry {
  id: string;
  action: string;
  type: AuditActionType;
  author: string;
  timestamp: string;
  contractId?: string;
  clauseTitle?: string;
}

// ─────────────────────────────────────────
// 계약 매트릭스 행 (필터 페이지용)
// ─────────────────────────────────────────
export interface MatrixRow {
  genre: Genre;
  gbClass: string;
  type: ContractFormType | string;
  party: string;
  partyHL: boolean;
  doc: string;
  docKey: string;
  tags: string[];
  funcs: string[];
}

// ─────────────────────────────────────────
// 사용자
// ─────────────────────────────────────────
export interface User {
  id: string;
  /** 로그인 사번 — 관리자가 사용자 관리에서 부여 (고유) */
  employeeId: string;
  /**
   * 로그인 비밀번호 — 로컬 데모만 평문 저장.
   * 운영: 서버 해시·인증만 사용하고 이 필드는 제거하세요.
   */
  loginPassword: string;
  name: string;
  email: string;
  /** 부서(USER_DEPARTMENTS 중 선택) */
  department: string;
  isActive: boolean;
}

// ─────────────────────────────────────────
// 선택 상태 (편집기 3단계 위저드)
// ─────────────────────────────────────────
export interface TemplateSelection {
  genre: Genre | null;
  type: ContractFormType | null;
  doc: ContractDocType | null;
  /**
   * null: 표준 매트릭스 조항만 사용.
   * 지정: 템플릿 관리에서 같은 ③ 유형(및 장르 규칙)으로 연결된 항목 id — 조항만 해당 관리 템플릿에서 불러옴.
   */
  matrixClauseSourceId: string | null;
}
