import { describe, expect, it } from 'vitest';
import type { StoredContractDraft } from './contractDraftTypes';
import { matchesContractListTab } from './contractListFilter';

function base(overrides: Partial<StoredContractDraft> = {}): StoredContractDraft {
  return {
    id: '1',
    updatedAt: new Date().toISOString(),
    contractDocumentTitle: '',
    templateLabel: 'T',
    displayVer: 'v1',
    saveGeneration: 1,
    clauses: [],
    selection: {
      genre: null,
      type: null,
      doc: null,
      matrixClauseSourceId: null,
    },
    editorOrigin: 'matrix',
    managedTemplateId: null,
    matrixClauseSourceName: null,
    auditEntries: [],
    ...overrides,
  };
}

describe('matchesContractListTab', () => {
  it('전체: 보관 포함 모두', () => {
    expect(matchesContractListTab(base(), 'all')).toBe(true);
    expect(matchesContractListTab(base({ archived: true }), 'all')).toBe(true);
  });
  it('보관: archived만', () => {
    expect(matchesContractListTab(base({ archived: true }), 'archived')).toBe(
      true,
    );
    expect(matchesContractListTab(base(), 'archived')).toBe(false);
  });
  it('초안: 대기·반려(비보관)', () => {
    expect(matchesContractListTab(base({ reviewStatus: 'pending' }), 'draft')).toBe(
      true,
    );
    expect(matchesContractListTab(base({ reviewStatus: 'rejected' }), 'draft')).toBe(
      true,
    );
    expect(matchesContractListTab(base({ reviewStatus: 'in_review' }), 'draft')).toBe(
      false,
    );
  });
  it('검토 중', () => {
    expect(
      matchesContractListTab(base({ reviewStatus: 'in_review' }), 'in_review'),
    ).toBe(true);
  });
  it('완료: 승인', () => {
    expect(matchesContractListTab(base({ reviewStatus: 'approved' }), 'done')).toBe(
      true,
    );
  });
});
