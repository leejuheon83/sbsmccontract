import { describe, expect, it } from 'vitest';
import type { StoredContractDraft } from './contractDraftTypes';
import { isDraftReviewApproved, matchesContractListTab } from './contractListFilter';

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

describe('isDraftReviewApproved', () => {
  it('approved·공백·대소문자 변형이면 true', () => {
    expect(isDraftReviewApproved(base({ reviewStatus: 'approved' }))).toBe(true);
    expect(isDraftReviewApproved(base({ reviewStatus: ' Approved ' }))).toBe(true);
    expect(isDraftReviewApproved(base({ reviewStatus: 'APPROVED' }))).toBe(true);
  });
  it('그 외는 false', () => {
    expect(isDraftReviewApproved(base({ reviewStatus: 'pending' }))).toBe(false);
    expect(isDraftReviewApproved(base({ reviewStatus: 'in_review' }))).toBe(false);
    expect(isDraftReviewApproved(base({}))).toBe(false);
  });
});
