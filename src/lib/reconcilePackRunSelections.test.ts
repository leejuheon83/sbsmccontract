import { describe, expect, it } from 'vitest';
import { reconcilePackRunSelections } from './reconcilePackRunSelections';

describe('reconcilePackRunSelections', () => {
  it('prev가 비어있으면 runIds 원본 순서로 전체 선택', () => {
    expect(reconcilePackRunSelections([], [['a', 'b']])).toEqual([['a', 'b']]);
    expect(reconcilePackRunSelections([[]], [['a', 'b']])).toEqual([['a', 'b']]);
  });

  it('사용자가 만든 체크 순서를 유지한다', () => {
    const prev = [['b', 'a']];
    const nextRuns = [['a', 'b', 'c']];
    expect(reconcilePackRunSelections(prev, nextRuns)).toEqual([['b', 'a', 'c']]);
  });

  it('run에서 사라진 항목은 제거한다', () => {
    const prev = [['b', 'a']];
    const nextRuns = [['a', 'c']];
    expect(reconcilePackRunSelections(prev, nextRuns)).toEqual([['a', 'c']]);
  });
});

