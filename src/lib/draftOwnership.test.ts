import { describe, expect, it } from 'vitest';
import type { StoredContractDraft } from './contractDraftTypes';
import { draftBelongsToEmployee } from './draftOwnership';

const baseDraft = (): StoredContractDraft => ({
  id: 'x',
  updatedAt: new Date().toISOString(),
  contractDocumentTitle: 'T',
  templateLabel: 'L',
  displayVer: 'v1.0',
  saveGeneration: 1,
  clauses: [],
  selection: { genre: null, type: null, doc: null, matrixClauseSourceId: null },
  editorOrigin: 'matrix',
  managedTemplateId: null,
  matrixClauseSourceName: null,
  auditEntries: [],
});

describe('draftBelongsToEmployee', () => {
  it('ownerEmployeeId가 있으면 사번만 비교', () => {
    const d = { ...baseDraft(), ownerEmployeeId: 'admin' };
    expect(draftBelongsToEmployee(d, 'admin')).toBe(true);
    expect(draftBelongsToEmployee(d, '150009')).toBe(false);
  });

  it('owner 없으면 감사 로그 author 중 일치', () => {
    const d = {
      ...baseDraft(),
      auditEntries: [
        {
          id: '1',
          action: '저장',
          type: 'save' as const,
          author: '150009',
          timestamp: '10:00',
        },
      ],
    };
    expect(draftBelongsToEmployee(d, '150009')).toBe(true);
    expect(draftBelongsToEmployee(d, 'admin')).toBe(false);
  });

  it('사번 없으면 false', () => {
    expect(draftBelongsToEmployee(baseDraft(), null)).toBe(false);
  });
});
