// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  applyPackRunRanksToFieldValues,
  applyEditableHighlightPackRunsToHtml,
  previewEditableHighlightPackRunsToHtml,
  buildHighlightSidebarRows,
  computeEditableHighlightPackRuns,
  isNumberedListLeadText,
} from './highlightPackApply';

describe('isNumberedListLeadText', () => {
  it('번호로 시작하는 정의 줄만 인식', () => {
    expect(isNumberedListLeadText('1. 간접광고')).toBe(true);
    expect(isNumberedListLeadText('  2) 항목')).toBe(true);
  });

  it('플레이스홀더·날짜 대괄호는 제외', () => {
    expect(isNumberedListLeadText('[골때녀]')).toBe(false);
    expect(isNumberedListLeadText('[2026. 3.30]')).toBe(false);
  });
});

describe('computeEditableHighlightPackRuns', () => {
  it('번호로 시작하는 연속 노란 박스만 pack, 그 외는 solo', () => {
    const p1 = document.createElement('p');
    p1.setAttribute('style', 'background-color:#FFF2CC');
    p1.textContent = '1. Alpha';
    const p2 = document.createElement('p');
    p2.setAttribute('style', 'background-color:#FFF2CC');
    p2.textContent = '2. Beta';
    const solo = document.createElement('p');
    const { packRuns, soloIds } = computeEditableHighlightPackRuns([
      p1,
      p2,
      solo,
    ]);
    expect(packRuns).toEqual([['h-1', 'h-2']]);
    expect(soloIds).toEqual(['h-3']);
  });

  it('노란 박스만 있고 번호 없으면 전부 solo (체크박스 그룹 없음)', () => {
    const p1 = document.createElement('p');
    p1.setAttribute('style', 'background-color:#FFF2CC');
    p1.textContent = '[골때녀]';
    const p2 = document.createElement('p');
    p2.setAttribute('style', 'background-color:#FFF2CC');
    p2.textContent = '[0]';
    const { packRuns, soloIds } = computeEditableHighlightPackRuns([p1, p2]);
    expect(packRuns).toEqual([]);
    expect(soloIds).toEqual(['h-1', 'h-2']);
  });

  it('번호 줄이 하나뿐이면 solo (최소 2개부터 그룹)', () => {
    const p1 = document.createElement('p');
    p1.setAttribute('style', 'background-color:#FFF2CC');
    p1.textContent = '1. Only';
    const { packRuns, soloIds } = computeEditableHighlightPackRuns([p1]);
    expect(packRuns).toEqual([]);
    expect(soloIds).toEqual(['h-1']);
  });
});

describe('buildHighlightSidebarRows', () => {
  it('문서 순서대로 pack은 한 번만, solo는 각각 행으로', () => {
    const rows = buildHighlightSidebarRows(
      ['h-1', 'h-2', 'h-3'],
      [['h-1', 'h-2']],
      ['h-3'],
    );
    expect(rows).toEqual([
      { type: 'pack', runIndex: 0 },
      { type: 'solo', id: 'h-3' },
    ]);
  });
});

describe('applyEditableHighlightPackRunsToHtml', () => {
  it('선택 순서대로 번호를 다시 붙임', () => {
    const html =
      '<p data-highlight-id="h-1" style="background-color:#FFF2CC">1. Alpha</p>' +
      '<p data-highlight-id="h-2" style="background-color:#FFF2CC">2. Beta</p>';
    const out = applyEditableHighlightPackRunsToHtml(
      html,
      [['h-1', 'h-2']],
      [['h-2', 'h-1']],
    );
    expect(out).toMatch(/1\.\s*Beta/);
    expect(out).toMatch(/2\.\s*Alpha/);
    expect(out.indexOf('1. Beta')).toBeLessThan(out.indexOf('2. Alpha'));
  });

  it('체크 해제된 항목은 제거', () => {
    const html =
      '<p data-highlight-id="h-1" style="background-color:#FFF2CC">1. A</p>' +
      '<p data-highlight-id="h-2" style="background-color:#FFF2CC">2. B</p>';
    const out = applyEditableHighlightPackRunsToHtml(
      html,
      [['h-1', 'h-2']],
      [['h-2']],
    );
    expect(out).toContain('1. B');
    expect(out).not.toContain('A');
  });
});

describe('applyPackRunRanksToFieldValues', () => {
  it('체크 순서(rank)에 맞춰 입력값 앞 번호를 재부여', () => {
    const out = applyPackRunRanksToFieldValues(
      [
        { id: 'h-1', value: '1. 간접광고' },
        { id: 'h-2', value: '2. 디지털 브랜디드 콘텐츠' },
      ],
      ['h-1', 'h-2'],
      ['h-2', 'h-1'],
    );
    expect(out).toEqual([
      { id: 'h-1', value: '2. 간접광고' },
      { id: 'h-2', value: '1. 디지털 브랜디드 콘텐츠' },
    ]);
  });

  it('미체크 항목은 값을 유지', () => {
    const out = applyPackRunRanksToFieldValues(
      [
        { id: 'h-1', value: '1. A' },
        { id: 'h-2', value: '2. B' },
      ],
      ['h-1', 'h-2'],
      ['h-2'],
    );
    expect(out).toEqual([
      { id: 'h-1', value: '1. A' },
      { id: 'h-2', value: '1. B' },
    ]);
  });
});

describe('previewEditableHighlightPackRunsToHtml', () => {
  it('미체크 항목을 유지한 채 체크 순서대로 위에서 재배치', () => {
    const html =
      '<p data-highlight-id="h-1" style="background-color:#FFF2CC">1. A</p>' +
      '<p data-highlight-id="h-2" style="background-color:#FFF2CC">2. B</p>' +
      '<p data-highlight-id="h-3" style="background-color:#FFF2CC">3. C</p>';
    const out = previewEditableHighlightPackRunsToHtml(
      html,
      [['h-1', 'h-2', 'h-3']],
      [['h-2', 'h-1']],
    );
    expect(out.indexOf('1. B')).toBeLessThan(out.indexOf('2. A'));
    expect(out).toContain('3. C');
  });
});
