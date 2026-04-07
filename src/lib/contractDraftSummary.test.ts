import { describe, expect, it } from 'vitest';
import type { StoredContractDraft } from './contractDraftTypes';
import { summarizeDraftBodyPreview } from './contractDraftSummary';

function minimalDraft(overrides: Partial<StoredContractDraft> = {}): StoredContractDraft {
  return {
    id: 'x',
    updatedAt: new Date().toISOString(),
    contractDocumentTitle: 'T',
    templateLabel: 'L',
    displayVer: 'v1',
    saveGeneration: 1,
    clauses: [{ num: '§1', title: 'a', state: 'review', body: 'hello world' }],
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

describe('summarizeDraftBodyPreview', () => {
  it('본문이 없으면 대시', () => {
    expect(summarizeDraftBodyPreview(minimalDraft({ clauses: [] }))).toBe('—');
  });

  it('HTML 태그 제거 후 길이 제한', () => {
    const d = minimalDraft({
      clauses: [
        {
          num: '§1',
          title: 't',
          state: 'review',
          body: '<p>안녕하세요 반갑습니다</p>',
        },
      ],
    });
    const s = summarizeDraftBodyPreview(d, 8);
    expect(s).not.toContain('<');
    expect(s.length).toBeLessThanOrEqual(9);
  });
});
