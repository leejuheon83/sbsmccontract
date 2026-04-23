import { describe, expect, it } from 'vitest';
import { isWordFormFieldHighlightRun, normalizeWordFillHex } from './wordFormFieldRun';

describe('normalizeWordFillHex', () => {
  it('ARGB 8자리를 RGB 6자리로 줄인다', () => {
    expect(normalizeWordFillHex('FFFFFF00')).toBe('FFFF00');
  });
});

describe('isWordFormFieldHighlightRun', () => {
  it('yellow·lightYellow highlight run을 인식', () => {
    expect(
      isWordFormFieldHighlightRun(
        '<w:r><w:rPr><w:highlight w:val="yellow"/></w:rPr><w:t>x</w:t></w:r>',
      ),
    ).toBe(true);
    expect(
      isWordFormFieldHighlightRun(
        '<w:r><w:rPr><w:highlight w:val="lightYellow"/></w:rPr><w:t>x</w:t></w:r>',
      ),
    ).toBe(true);
    expect(
      isWordFormFieldHighlightRun(
        '<w:r><w:rPr><w14:highlight w:val="lightYellow"/></w:rPr><w:t>x</w:t></w:r>',
      ),
    ).toBe(true);
  });

  it('none/clear·일반 텍스트 run은 제외', () => {
    expect(
      isWordFormFieldHighlightRun(
        '<w:r><w:rPr><w:highlight w:val="none"/></w:rPr><w:t>x</w:t></w:r>',
      ),
    ).toBe(false);
    expect(
      isWordFormFieldHighlightRun('<w:r><w:t>plain</w:t></w:r>'),
    ).toBe(false);
  });
});
