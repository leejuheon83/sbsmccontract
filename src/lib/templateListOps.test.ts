import { describe, expect, it } from 'vitest';
import type { TemplateListItem } from '../types/managedTemplate';
import {
  applyAdd,
  applyDiscard,
  applyRemove,
  applyUpdateItem,
  formatTemplateMeta,
} from './templateListOps';

const sample: TemplateListItem = {
  id: 'a',
  name: 'Test',
  clauseCount: 1,
  formFieldCount: 2,
  ver: 'v1.0',
  tone: 'primary',
  status: 'active',
};

describe('templateListOps', () => {
  it('applyDiscard marks one item discarded', () => {
    const next = applyDiscard([sample], 'a');
    expect(next[0].status).toBe('discarded');
  });

  it('applyRemove drops item', () => {
    expect(applyRemove([sample], 'a')).toEqual([]);
  });

  it('applyAdd appends', () => {
    const b = { ...sample, id: 'b', name: 'B' };
    expect(applyAdd([sample], b)).toHaveLength(2);
  });

  it('formatTemplateMeta', () => {
    expect(formatTemplateMeta(12, 18)).toBe('조항 12개 · 폼 필드 18개');
    expect(formatTemplateMeta(10, 0, true)).toBe('조항 10개 · 폐기됨');
    expect(formatTemplateMeta(0, 0)).toBe('관리용 템플릿');
    expect(formatTemplateMeta(0, 0, true)).toBe('폐기됨');
  });

  it('applyUpdateItem merges fields and keeps id·status', () => {
    const next = applyUpdateItem([sample], 'a', { name: 'Renamed', ver: 'v9' });
    expect(next[0].name).toBe('Renamed');
    expect(next[0].ver).toBe('v9');
    expect(next[0].id).toBe('a');
    expect(next[0].status).toBe('active');
  });
});
