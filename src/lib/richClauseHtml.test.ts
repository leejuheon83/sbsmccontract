import { describe, expect, it } from 'vitest';
import { countYellowEditableHighlightsInHtml } from './richClauseHtml';

describe('countYellowEditableHighlightsInHtml', () => {
  it('mark 태그는 노란 하이라이트로 간주', () => {
    expect(
      countYellowEditableHighlightsInHtml('<p><mark>프로그램</mark></p>'),
    ).toBe(1);
  });

  it('일반 문단만 있으면 0', () => {
    expect(countYellowEditableHighlightsInHtml('<p>본문만</p>')).toBe(0);
  });
});
