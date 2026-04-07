import type { AuditEntry, Clause, TemplateSelection } from '../types/contract';

/** 계약 목록에서 담당자 검토·승인 진행 (로컬 IndexedDB) */
export type ContractReviewStatus =
  | 'pending'
  | 'in_review'
  | 'approved'
  | 'rejected';

/**
 * Snapshot stored in IndexedDB (browser “internal DB”) for draft recovery and audit.
 * Ready to map to Supabase rows later (same shape, server-generated id).
 */
export interface StoredContractDraft {
  id: string;
  updatedAt: string;
  contractDocumentTitle: string;
  templateLabel: string;
  displayVer: string;
  saveGeneration: number;
  clauses: Clause[];
  selection: TemplateSelection;
  editorOrigin: 'matrix' | 'managed';
  managedTemplateId: string | null;
  matrixClauseSourceName: string | null;
  auditEntries: AuditEntry[];
  /** 검토/승인 워크플로 (미지정 시 목록에서 대기로 표시) */
  reviewStatus?: ContractReviewStatus;
  /** 저장 버전별 검토 상태 (편집기 버전 이력 탭) */
  versionReviewByVer?: Record<
    string,
    'pending' | 'approved' | 'rejected'
  >;
  /** 목록 탭「보관」분류 */
  archived?: boolean;
}
