import { describe, expect, it } from 'vitest';
import {
  countPlaceholders,
  formatPlaceholderContent,
  joinParagraphs,
  mergeStrippedClauseBodyWithTitleLine,
  placeholderInner,
  replaceNthPlaceholder,
  splitBodyIntoParagraphs,
  splitClauseBody,
  stripLeadingTitleFromBodyIfDuplicate,
} from './clausePlaceholders';

describe('splitClauseBody', () => {
  it('플레이스홀더가 없으면 텍스트만', () => {
    expect(splitClauseBody('hello')).toEqual([{ kind: 'text', text: 'hello' }]);
  });

  it('[  ] 및 [변수] 분리', () => {
    expect(splitClauseBody('금액 [  ] 원 및 [광고주명] 확인')).toEqual([
      { kind: 'text', text: '금액 ' },
      { kind: 'placeholder', raw: '[  ]' },
      { kind: 'text', text: ' 원 및 ' },
      { kind: 'placeholder', raw: '[광고주명]' },
      { kind: 'text', text: ' 확인' },
    ]);
  });
});

describe('replaceNthPlaceholder', () => {
  it('첫 번째만 치환', () => {
    const b = replaceNthPlaceholder('a [x] b [y]', 0, '1');
    expect(b).toBe('a [1] b [y]');
  });

  it('두 번째만 치환', () => {
    const b = replaceNthPlaceholder('a [x] b [y]', 1, '2');
    expect(b).toBe('a [x] b [2]');
  });

  it('빈 문자열이면 [  ]', () => {
    expect(replaceNthPlaceholder('[old]', 0, '')).toBe('[  ]');
  });
});

describe('placeholderInner', () => {
  it('[광고주명] → 광고주명', () => {
    expect(placeholderInner('[광고주명]')).toBe('광고주명');
  });

  it('[  ] 내부 공백 유지', () => {
    expect(placeholderInner('[  ]')).toBe('  ');
  });
});

describe('formatPlaceholderContent', () => {
  it('빈값', () => {
    expect(formatPlaceholderContent('')).toBe('[  ]');
  });
  it('값 있음', () => {
    expect(formatPlaceholderContent('abc')).toBe('[abc]');
  });
});

describe('countPlaceholders', () => {
  it('0', () => expect(countPlaceholders('none')).toBe(0));
  it('2', () => expect(countPlaceholders('[a] [b]')).toBe(2));
});

describe('splitBodyIntoParagraphs / joinParagraphs', () => {
  it('빈 문자열은 단일 빈 단락', () => {
    expect(splitBodyIntoParagraphs('')).toEqual(['']);
  });

  it('빈 줄 없으면 한 덩어리', () => {
    expect(splitBodyIntoParagraphs('a\nb')).toEqual(['a\nb']);
  });

  it('빈 줄 2개로 분리', () => {
    expect(splitBodyIntoParagraphs('첫\n\n둘')).toEqual(['첫', '둘']);
  });

  it('joinParagraphs는 split의 역', () => {
    const body = 'A [x]\n\nB [y]';
    expect(joinParagraphs(splitBodyIntoParagraphs(body))).toBe(body);
  });
});

describe('stripLeadingTitleFromBodyIfDuplicate / mergeStrippedClauseBodyWithTitleLine', () => {
  it('제목 마지막 절과 본문 첫 줄이 같으면 읽기용에서 첫 줄 제거', () => {
    const title = '제1장 총칙 · 제1조(목적)';
    const body = '제1조(목적)\n\n① 내용';
    expect(stripLeadingTitleFromBodyIfDuplicate(body, title)).toBe('① 내용');
  });

  it('첫 줄이 다르면 본문 그대로', () => {
    const title = '제1조(목적)';
    const body = '제1조(목적) 계속\n\n② 내용';
    expect(stripLeadingTitleFromBodyIfDuplicate(body, title)).toBe(body);
  });

  it('플레이스홀더 편집 후 저장 시 조 제목 줄 복원', () => {
    const title = '제1장 · 제1조(목적)';
    const full = '제1조(목적)\n\n① [  ]';
    const stripped = stripLeadingTitleFromBodyIfDuplicate(full, title);
    expect(stripped).toBe('① [  ]');
    const merged = mergeStrippedClauseBodyWithTitleLine(
      '① [완료]',
      full,
      title,
    );
    expect(merged).toBe('제1조(목적)\n\n① [완료]');
  });
});
