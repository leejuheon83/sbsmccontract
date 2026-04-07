import { describe, expect, it } from 'vitest';
import type { TemplateListItem } from '../types/managedTemplate';
import {
  findBuiltinClausesForManagedItem,
  findManagedTemplateForSelection,
  hintBodyForNonExtractableAttachment,
  isDocxFile,
  isPlaceholderFallbackClauses,
  listManagedCandidatesForSelection,
  resolveClausesFromManagedItem,
  resolveClausesFromManagedItemWithFallbacks,
  splitUploadToClauses,
} from './managedTemplateAdapter';

const sel = (
  g: '교양' | '예능',
  t: '2자계약' | '위수탁 계약',
  d: '협찬 계약서' | '대행 계약서',
) => ({
  genre: g,
  type: t,
  doc: d,
  matrixClauseSourceId: null as string | null,
});

function item(
  overrides: Partial<TemplateListItem> & Pick<TemplateListItem, 'id' | 'name'>,
): TemplateListItem {
  return {
    clauseCount: 0,
    formFieldCount: 0,
    ver: 'v1.0',
    tone: 'primary',
    status: 'active',
    ...overrides,
  };
}

describe('resolveClausesFromManagedItem (업로드 vs 저장본)', () => {
  it('clausesAuthoritative이면 편집기 저장 조항이 업로드 텍스트보다 우선', () => {
    const out = resolveClausesFromManagedItem(
      item({
        id: 'auth',
        name: 'n',
        clausesAuthoritative: true,
        clauses: [
          {
            num: '§1',
            title: '편집 저장',
            state: 'approved',
            body: '저장본',
          },
        ],
        attachment: {
          fileName: 'u.txt',
          size: 4,
          mimeType: 'text/plain',
          textContent: '업로드만\n\n있음',
        },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('편집 저장');
    expect(out[0]?.body).toBe('저장본');
  });

  it('Authoritative가 아니면 UTF-8 업로드 본문으로 조항을 다시 나눔 (옛 매트릭스 조항 무시)', () => {
    const out = resolveClausesFromManagedItem(
      item({
        id: 'up',
        name: 'n',
        clauses: [
          {
            num: '§1',
            title: '계약 목적',
            state: 'approved',
            body: '매트릭스에서 복사된 내용',
          },
        ],
        attachment: {
          fileName: 'c.txt',
          size: 10,
          mimeType: 'text/plain',
          textContent: '고객이 올린 단일 문단 전문',
        },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('업로드 본문');
    expect(out[0]?.body).toContain('고객이 올린');
  });

  it('첨부에 htmlContent가 있으면 표를 보존하는 단일 HTML 조항으로 반환', () => {
    const out = resolveClausesFromManagedItem(
      item({
        id: 'docx-html',
        name: '문서',
        attachment: {
          fileName: '표.docx',
          size: 128,
          mimeType:
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          textContent: '텍스트 추출',
          htmlContent:
            '<table><tr><td>헤더</td></tr><tr><td>값</td></tr></table>',
        },
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.title).toBe('원본 서식(표 포함)');
    expect(out[0]?.bodyFormat).toBe('html');
    expect(out[0]?.body).toContain('<table>');
    expect(out[0]?.body).toContain('<td>값</td>');
  });

  it('clausesAuthoritative 저장본에서도 조 제목 단독 조항 + 다음 내용 조항은 한 조항으로 병합', () => {
    const out = resolveClausesFromManagedItem(
      item({
        id: 'merge-auth',
        name: 'n',
        clausesAuthoritative: true,
        clauses: [
          {
            num: '§9',
            title: '부분 9',
            state: 'review',
            body: '제 1 조 (계약의 목적)',
          },
          {
            num: '§10',
            title: '부분 10',
            state: 'review',
            body: '본 계약은 SBS와 광고주 간 권리·의무를 정한다.',
          },
          {
            num: '§11',
            title: '부분 11',
            state: 'review',
            body: '제 2 조 (정의)',
          },
          {
            num: '§12',
            title: '부분 12',
            state: 'review',
            body: '용어의 정의는 다음과 같다.',
          },
        ],
      }),
    );

    expect(out).toHaveLength(2);
    expect(out[0]?.body).toContain('제 1 조');
    expect(out[0]?.body).toContain('권리·의무');
    expect(out[1]?.body).toContain('제 2 조');
    expect(out[1]?.body).toContain('용어의 정의');
    expect(out[0]?.num).toBe('§1');
    expect(out[1]?.num).toBe('§2');
  });

  it('clausesAuthoritative 저장본에서 제1조 전 표지 블록은 모두 부분 1로 병합', () => {
    const out = resolveClausesFromManagedItem(
      item({
        id: 'merge-cover-auth',
        name: 'n',
        clausesAuthoritative: true,
        clauses: [
          { num: '§1', title: '부분 1', state: 'review', body: '마케팅 라이선스 패키지 계약서' },
          { num: '§2', title: '부분 2', state: 'review', body: '프로그램' },
          { num: '§3', title: '부분 3', state: 'review', body: '2026. 00' },
          { num: '§4', title: '부분 4', state: 'review', body: '(주)SBS' },
          { num: '§5', title: '부분 5', state: 'review', body: '제1조 (계약의 목적)' },
          { num: '§6', title: '부분 6', state: 'review', body: '본 계약은 다음과 같다.' },
        ],
      }),
    );

    expect(out).toHaveLength(2);
    expect(out[0]?.title).toBe('부분 1');
    expect(out[0]?.body).toContain('마케팅 라이선스 패키지 계약서');
    expect(out[0]?.body).toContain('프로그램');
    expect(out[0]?.body).toContain('2026. 00');
    expect(out[0]?.body).toContain('(주)SBS');
    expect(out[1]?.body).toContain('제1조');
    expect(out[1]?.body).toContain('본 계약은');
  });
});

describe('resolveClausesFromManagedItemWithFallbacks', () => {
  it('PDF 등 본문 미추출 첨부가 있으면 표준 매트릭스로 덮어쓰지 않음', () => {
    const body = hintBodyForNonExtractableAttachment('계약.pdf');
    const out = resolveClausesFromManagedItemWithFallbacks(
      item({
        id: 'pdf',
        name: 'x',
        linkedDocType: '마케팅 라이선스',
        attachment: {
          fileName: '계약.pdf',
          size: 100,
          mimeType: 'application/pdf',
        },
        clauses: [
          { num: '§1', title: '초안', state: 'review', body },
        ],
      }),
      {
        genre: '예능',
        type: '2자계약',
        doc: '마케팅 라이선스',
      },
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.body).toContain('계약.pdf');
    expect(out[0]?.body).not.toContain('광고주(이하 "을")');
  });

  it('관리 항목에 조항이 없으면 linkedDocType 표준 매트릭스 조항을 씀', () => {
    const clauses = resolveClausesFromManagedItemWithFallbacks(
      item({
        id: 'tpl-mkt-sbs',
        name: '표준 마케팅 계약서(SBS-SBSM&C)',
        linkedDocType: '마케팅 라이선스',
        clauseCount: 51,
      }),
      null,
    );
    expect(clauses.length).toBeGreaterThan(1);
    expect(clauses[0]?.title).not.toBe('초안');
  });

  it('①②③ 선택이 있으면 해당 표준 템플릿을 우선', () => {
    const clauses = resolveClausesFromManagedItemWithFallbacks(
      item({
        id: 'x',
        name: '빈 카드',
        linkedDocType: '마케팅 라이선스',
      }),
      {
        genre: '예능',
        type: '위수탁 계약',
        doc: '마케팅 라이선스',
      },
    );
    const raw = resolveClausesFromManagedItem(
      item({
        id: 'x',
        name: '빈 카드',
        linkedDocType: '마케팅 라이선스',
      }),
    );
    expect(isPlaceholderFallbackClauses(raw)).toBe(true);
    expect(clauses[0]?.body).toContain('수탁자');
  });

  it('저장된 조항이 있으면 폴백 없이 그대로', () => {
    const clauses = resolveClausesFromManagedItemWithFallbacks(
      item({
        id: 'y',
        name: '직접 저장',
        clauses: [
          {
            num: '§1',
            title: '테스트',
            state: 'approved',
            body: '본문',
          },
        ],
      }),
      null,
    );
    expect(clauses).toHaveLength(1);
    expect(clauses[0]?.title).toBe('테스트');
  });
});

describe('isPlaceholderFallbackClauses', () => {
  it('단일 안내 조항이면 true', () => {
    expect(
      isPlaceholderFallbackClauses(
        resolveClausesFromManagedItem(
          item({ id: 'z', name: '빈', linkedDocType: '협찬 계약서' }),
        ),
      ),
    ).toBe(true);
  });
});

describe('findBuiltinClausesForManagedItem', () => {
  it('linkedGenre가 있으면 해당 장르만 스캔', () => {
    const c = findBuiltinClausesForManagedItem(
      item({
        id: '1',
        name: '교양 협찬',
        linkedDocType: '협찬 계약서',
        linkedGenre: '교양',
      }),
    );
    expect(c?.length).toBeGreaterThan(0);
    expect(c?.[0]?.body).toContain('교양');
  });
});

describe('splitUploadToClauses', () => {
  it('단일 블록이면 한 조항', () => {
    const c = splitUploadToClauses('단일 문단');
    expect(c).toHaveLength(1);
    expect(c[0].body).toContain('단일');
  });

  it('빈 줄로 나누면 여러 조항', () => {
    const c = splitUploadToClauses('제목A\n\n본문B\n줄\n\n제목C\n다음');
    expect(c.length).toBeGreaterThanOrEqual(2);
  });

  it('「제 N 조」가 한글만 있어도 법령 파서가 동작해 조 제목과 본문이 한 조항으로 묶임', () => {
    const c = splitUploadToClauses(
      ['제 1 조 (계약의 목적)', '', '본 계약은 SBS와 광고주 간 약속입니다.'].join('\n\n'),
    );
    expect(c).toHaveLength(1);
    expect(c[0]?.body).toContain('제 1 조');
    expect(c[0]?.body).toContain('본 계약은');
  });

  it('제1조 전 표지 블록이 여러 개여도 하나의 「부분 1」로 묶임', () => {
    const c = splitUploadToClauses(
      [
        '마케팅 라이선스 패키지 계약서',
        '',
        '프로그램',
        '',
        '2026. 00',
        '',
        '(주)SBS',
        '',
        '제1조 (계약의 목적)',
        '',
        '본 계약은 다음과 같다.',
      ].join('\n\n'),
    );
    expect(c.length).toBeGreaterThanOrEqual(2);
    expect(c[0]?.title).toBe('부분 1');
    expect(c[0]?.body).toContain('마케팅 라이선스 패키지 계약서');
    expect(c[0]?.body).toContain('프로그램');
    expect(c[0]?.body).toContain('2026. 00');
    expect(c[0]?.body).toContain('(주)SBS');
    expect(c[1]?.body).toContain('제1조');
    expect(c[1]?.body).toContain('본 계약은');
  });

  it('제1장/제1조/①② 항 형태면 장·항 단위로 조항을 분리', () => {
    const c = splitUploadToClauses(
      [
        '제1장 총칙',
        '',
        '제1조(목적)',
        '',
        '① 갑은 본 계약의 목적을 이해한다.',
        '',
        '② 을은 본 계약을 준수한다.',
      ].join('\n'),
    );
    // 표지·제1조 이전은 「부분 1」로 묶고,
    // “제1조”는 조 제목 줄이 본문에 포함되며 ①/②가 같은 조항에 포함되어야 함
    expect(c.length).toBe(2);
    expect(c[0]?.title).toBe('부분 1');
    expect(c[0]?.body).toContain('제1장 총칙');

    expect(c[1]?.title).toContain('제1장');
    expect(c[1]?.title).toContain('제1조');
    expect(c[1]?.body).toContain('제1조(목적)');
    expect(c[1]?.body).toContain('①');
    expect(c[1]?.body).toContain('②');
  });
});

describe('findManagedTemplateForSelection', () => {
  it('linkedDocType이 일치하는 활성 항목을 반환', () => {
    const items = [
      item({
        id: '1',
        name: '협찬 A',
        linkedDocType: '협찬 계약서',
        linkedGenre: '교양',
      }),
    ];
    const hit = findManagedTemplateForSelection(sel('교양', '2자계약', '협찬 계약서'), items);
    expect(hit?.name).toBe('협찬 A');
  });

  it('장르 일치 항목을 장르 미지정 항목보다 우선', () => {
    const items = [
      item({
        id: 'any',
        name: '공통',
        linkedDocType: '협찬 계약서',
      }),
      item({
        id: 'ko',
        name: '교양 전용',
        linkedDocType: '협찬 계약서',
        linkedGenre: '교양',
      }),
    ];
    const hit = findManagedTemplateForSelection(sel('교양', '2자계약', '협찬 계약서'), items);
    expect(hit?.name).toBe('교양 전용');
  });

  it('같은 유형에 장르 전용이 없으면 linkedGenre 없는 항목 사용', () => {
    const items = [
      item({
        id: 'any',
        name: '공통',
        linkedDocType: '협찬 계약서',
      }),
    ];
    const hit = findManagedTemplateForSelection(sel('예능', '위수탁 계약', '협찬 계약서'), items);
    expect(hit?.name).toBe('공통');
  });

  it('폐기·다른 유형은 무시', () => {
    const items = [
      item({
        id: 'd',
        name: '폐기',
        linkedDocType: '협찬 계약서',
        status: 'discarded',
      }),
      item({
        id: 'o',
        name: '다른 유형',
        linkedDocType: '대행 계약서',
      }),
    ];
    expect(findManagedTemplateForSelection(sel('교양', '2자계약', '협찬 계약서'), items)).toBeNull();
  });
});

describe('listManagedCandidatesForSelection', () => {
  it('장르가 맞지 않는 전용 연결은 후보에서 제외', () => {
    const items = [
      item({
        id: 'e',
        name: '예능만',
        linkedDocType: '협찬 계약서',
        linkedGenre: '예능',
      }),
    ];
    const list = listManagedCandidatesForSelection(sel('교양', '2자계약', '협찬 계약서'), items);
    expect(list).toHaveLength(0);
  });

  it('linkedFormType이 지정된 경우 해당 계약형태에만 노출', () => {
    const items = [
      item({
        id: 'any',
        name: '공통',
        linkedDocType: '협찬 계약서',
      }),
      item({
        id: 'two',
        name: '2자 전용',
        linkedDocType: '협찬 계약서',
        linkedFormType: '2자계약',
      }),
    ];
    const forTwo = listManagedCandidatesForSelection(sel('교양', '2자계약', '협찬 계약서'), items);
    const forTrust = listManagedCandidatesForSelection(sel('교양', '위수탁 계약', '협찬 계약서'), items);
    // 이름순 정렬이 적용되므로 공통 → 2자 전용 순서
    expect(forTwo.map((i) => i.name)).toEqual(['2자 전용', '공통']);
    expect(forTrust.map((i) => i.name)).toEqual(['공통']);
  });

  it('이름 순으로 정렬', () => {
    const items = [
      item({
        id: 'b',
        name: 'B 템플릿',
        linkedDocType: '협찬 계약서',
      }),
      item({
        id: 'a',
        name: 'A 템플릿',
        linkedDocType: '협찬 계약서',
      }),
    ];
    const list = listManagedCandidatesForSelection(sel('교양', '2자계약', '협찬 계약서'), items);
    expect(list.map((i) => i.name)).toEqual(['A 템플릿', 'B 템플릿']);
  });
});

describe('isDocxFile', () => {
  it('.docx 확장자면 true', () => {
    expect(isDocxFile(new File([], '계약.docx', { type: '' }))).toBe(true);
  });
  it('wordprocessingml MIME이면 true', () => {
    expect(
      isDocxFile(
        new File([], 'x', {
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        }),
      ),
    ).toBe(true);
  });
  it('일반 텍스트는 false', () => {
    expect(isDocxFile(new File([], 'a.txt', { type: 'text/plain' }))).toBe(false);
  });
});
