// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  countSelectablePackMarkers,
  countYellowEditableHighlightsInHtml,
  injectSelectablePackMarkers,
} from './richClauseHtml';

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

describe('injectSelectablePackMarkers', () => {
  it('연한 노란 배경 문단에 data-co-pack-id 부여', () => {
    const html =
      '<p style="background-color:#FFF2CC">1. <strong>간접광고</strong></p>' +
      '<p style="background-color:#FFF2CC">2. <strong>디지털</strong></p>';
    const out = injectSelectablePackMarkers(html);
    expect(out).toContain('data-co-pack-id="0"');
    expect(out).toContain('data-co-pack-id="1"');
    expect(out).toContain('co-selectable-pack');
    expect(countSelectablePackMarkers(html)).toBe(2);
  });

  it('일반 본문이면 마커 없음', () => {
    const html = '<p>일반 텍스트</p>';
    expect(countSelectablePackMarkers(html)).toBe(0);
  });
});
