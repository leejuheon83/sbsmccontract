// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import {
  parsePackClauseSegments,
  rebuildHtmlWithPackSelection,
  renumberPackOuterHtml,
} from './packClauseSegments';

describe('parsePackClauseSegments', () => {
  it('노란 박스 문단을 pack으로 구분', () => {
    const html =
      '<p>인트로</p>' +
      '<p style="background-color:#FFF2CC">1. <strong>A</strong></p>' +
      '<p style="background-color:#FFF2CC">2. <strong>B</strong></p>';
    const p = parsePackClauseSegments(html);
    expect(p).not.toBeNull();
    expect(p!.packCount).toBe(2);
    expect(p!.segments.filter((s) => s.type === 'static')).toHaveLength(1);
    expect(p!.segments.filter((s) => s.type === 'pack')).toHaveLength(2);
  });

  it('pack 없으면 null', () => {
    expect(parsePackClauseSegments('<p>만</p>')).toBeNull();
  });
});

describe('rebuildHtmlWithPackSelection', () => {
  it('선택한 pack만 남기고 순서·번호 반영', () => {
    const html =
      '<p>X</p>' +
      '<p style="background-color:#FFF2CC">1. <strong>A</strong></p>' +
      '<p style="background-color:#FFF2CC">2. <strong>B</strong></p>' +
      '<p style="background-color:#FFF2CC">3. <strong>C</strong></p>';
    const p = parsePackClauseSegments(html);
    expect(p).not.toBeNull();
    const out = rebuildHtmlWithPackSelection(p!.segments, [2, 0]);
    expect(out).toContain('<p>X</p>');
    expect(out).toMatch(/1\.\s*<strong>C/);
    expect(out).toMatch(/2\.\s*<strong>A/);
    expect(out).not.toContain('B');
  });
});

describe('renumberPackOuterHtml', () => {
  it('앞 번호를 새 번호로 교체', () => {
    const o =
      '<p style="background:#fff2cc">5. <strong>Hi</strong></p>';
    const r = renumberPackOuterHtml(o, 1);
    expect(r).toContain('1.');
    expect(r).toContain('<strong>Hi</strong>');
    expect(r).not.toMatch(/5\./);
  });
});
