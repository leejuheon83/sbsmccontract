// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyPlainHighlightValuesToClauseHtml,
  applySidebarHighlightValuesToRichEditorHtml,
  countSelectablePackMarkers,
  countYellowEditableHighlightsInHtml,
  extractEditableHighlightPlainTextsFromClauseHtml,
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

describe('extractEditableHighlightPlainTextsFromClauseHtml', () => {
  it('편집기와 동일하게 mark·yellow span 순서로 추출', () => {
    const html =
      '<p><mark>첫</mark> 끝 <span style="background-color: #ffff00">둘</span></p>';
    expect(extractEditableHighlightPlainTextsFromClauseHtml(html)).toEqual([
      '첫',
      '둘',
    ]);
  });
});

describe('applyPlainHighlightValuesToClauseHtml', () => {
  it('저장용 HTML의 노란 필드 순서대로 텍스트를 바꾼다', () => {
    const html = '<p><mark>구</mark> / <mark>날짜</mark></p>';
    const out = applyPlainHighlightValuesToClauseHtml(html, ['신규', '2026. 4']);
    expect(extractEditableHighlightPlainTextsFromClauseHtml(out)).toEqual([
      '신규',
      '2026. 4',
    ]);
  });
});

describe('applySidebarHighlightValuesToRichEditorHtml', () => {
  it('data-highlight-id 기준으로 편집기 HTML에 값을 반영', () => {
    const editor =
      '<p><mark data-highlight-id="h-1" data-editable-highlight="1">구</mark></p>';
    const out = applySidebarHighlightValuesToRichEditorHtml(editor, [
      { id: 'h-1', value: '신규' },
    ]);
    expect(out).toContain('신규');
    expect(out).not.toContain('>구</mark>');
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
