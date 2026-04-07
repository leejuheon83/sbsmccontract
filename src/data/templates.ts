// src/data/templates.ts
// 장르 × 계약형태 × 계약서유형 표준 계약서 데이터
// index.html의 TEMPLATES 객체를 TypeScript로 이전

import type {
  ContractDocType,
  ContractFormType,
  ContractTemplate,
  Genre,
  TemplateMap,
} from '../types/contract';

export const TEMPLATES: TemplateMap = {
  교양: {
    '2자계약': {
      '협찬 계약서': {
        label: '교양 2자 협찬 계약서',
        ver: 'v2.3',
        tags: ['SBS-광고주/대행사'],
        color: 'db-협찬',
        iconBg: '#DBEAFE',
        iconStroke: '#1E40AF',
        aiSuggest: {
          title: '간접광고 고지 조항',
          reason: '📎 근거: \'교양 프로그램 + 협찬\' 조건 감지',
          body: '본 프로그램에 포함된 협찬 내용은 방송통신위원회 고시에 따라 시청자에게 고지되어야 한다. 협찬주는 방송법 제74조에 따른 협찬 고지 방법 및 기준을 준수하여야 한다...',
        },
        clauses: [
          { num: '§1', title: '계약 목적', state: 'approved', body: '본 계약은 [광고주명](이하 "갑")와 당사(이하 "을") 간에 교양 프로그램 [프로그램명] 협찬 관계에서 발생하는 권리·의무를 규정함을 목적으로 한다.' },
          { num: '§2', title: '협찬 내용 및 범위', state: 'approved', body: '갑은 을에게 별지 [협찬별지명]에 기재된 협찬 물품·서비스·금전을 제공하고, 을은 해당 프로그램 방송 시 이를 노출한다.' },
          { num: '§3', title: '협찬 고지 의무', state: 'review', body: '을은 방송통신위원회 고시에 따라 협찬 고지를 실시하며, "갑"의 브랜드명 또는 상호를 화면에 표시한다. 고지 방법은 별도 협의한다.' },
          { num: '§4', title: '계약 기간', state: 'approved', body: '본 계약의 유효기간은 계약 체결일로부터 1년으로 하며, 당사자 일방의 서면 통보가 없는 경우 동일 조건으로 자동 연장된다.' },
          { num: '§5', title: '협찬 대가 및 지급', state: 'approved', body: '갑이 제공하는 협찬 물품의 시가 또는 협찬금은 별지 기재에 따르며, 을은 방송 완료 후 [세금계산서발행기한]일 이내에 세금계산서를 발행한다.' },
        ],
      },
      '대행 계약서': {
        label: '교양 2자 대행 계약서',
        ver: 'v1.8',
        tags: ['SBS-MC'],
        color: 'db-대행',
        iconBg: '#F1F5F9',
        iconStroke: '#334155',
        aiSuggest: {
          title: '대행사 책임 한도 조항',
          reason: '📎 근거: \'대행사 계약 + 교양 프로그램\' 조건 감지',
          body: '대행사는 협찬주와의 계약 이행에 있어 선량한 관리자의 주의 의무를 다하여야 하며, 귀책 사유로 인한 손해에 대해서만 책임을 부담한다...',
        },
        clauses: [
          { num: '§1', title: '계약 목적', state: 'approved', body: '본 계약은 SBS(이하 "갑")와 대행사(이하 "을") 간에 교양 프로그램 관련 광고·협찬 대행 업무 범위와 조건을 규정한다.' },
          { num: '§2', title: '대행 업무 범위', state: 'approved', body: '을은 갑이 지정한 교양 프로그램의 광고 영업, 협찬 유치, 계약 체결 대행, 수금 업무를 수행한다.' },
          { num: '§3', title: '대행 수수료', state: 'review', body: '갑은 을에게 협찬 수금액의 [대행수수료율]%에 해당하는 대행 수수료를 지급한다. 수수료 지급 시기는 수금일로부터 15일 이내로 한다.' },
          { num: '§4', title: '보고 의무', state: 'approved', body: '을은 매월 말일 영업 현황 보고서를 갑에게 제출하고, 계약 협찬사 현황 및 수금 내역을 공유한다.' },
        ],
      },
    },
    '위수탁 계약': {
      '협찬 계약서': {
        label: '교양 위수탁 협찬 계약서',
        ver: 'v2.1',
        tags: ['MC-협찬주', 'SBS-MC'],
        color: 'db-협찬',
        iconBg: '#DBEAFE',
        iconStroke: '#1E40AF',
        aiSuggest: {
          title: '재위탁 금지 조항',
          reason: '📎 근거: \'위수탁 구조 + MC 중간 단계\' 조건 감지',
          body: '수탁자는 위탁자의 사전 서면 동의 없이 본 계약에 따른 권리·의무를 제3자에게 재위탁하거나 양도할 수 없다...',
        },
        clauses: [
          { num: '§1', title: '계약 목적', state: 'approved', body: '본 계약은 MC(이하 \'수탁자\')가 협찬주(이하 \'갑\')와의 협찬 계약 체결 및 이행을 SBS로부터 위탁받아 수행함에 필요한 사항을 규정한다.' },
          { num: '§2', title: '위탁 업무 범위', state: 'approved', body: '수탁자는 갑으로부터 협찬 물품·서비스를 수령하고, 해당 교양 프로그램 내에서 갑의 브랜드를 노출하는 업무를 수행한다.' },
          { num: '§3', title: '수탁 수수료', state: 'review', body: 'SBS는 협찬 수금액에서 수탁자에게 [수탁수수료율]%의 수탁 수수료를 지급한다. 지급일은 방송 완료 후 30일 이내로 한다.' },
          { num: '§4', title: '재위탁 금지', state: 'approved', body: '수탁자는 본 계약에 따른 권리·의무를 제3자에게 재위탁하거나 양도할 수 없다.' },
        ],
      },
    },
    '언진원 계약': {
      '정부 계약서': {
        label: '교양 언진원 정부 약정서',
        ver: 'v1.0',
        tags: ['SBS-언진'],
        color: 'db-정부',
        iconBg: '#DCFCE7',
        iconStroke: '#15803D',
        aiSuggest: {
          title: '정부 지원금 정산 조항',
          reason: '📎 근거: \'정부 기관 + 언론진흥원\' 조건 감지',
          body: '수령한 정부 지원금은 승인된 예산 항목에 따라 집행되어야 하며, 사업 완료 후 60일 이내에 정산 보고서를 제출하여야 한다...',
        },
        clauses: [
          { num: '§1', title: '약정 목적', state: 'approved', body: '본 약정은 한국언론진흥재단(이하 \'재단\')과 SBS(이하 \'수행사\') 간 교양 프로그램 제작 지원 사업의 수행에 관한 사항을 규정한다.' },
          { num: '§2', title: '지원 내용', state: 'approved', body: '재단은 수행사에게 별지 사업계획서에 기재된 교양 프로그램 제작 지원금 및 현물을 지원한다.' },
          { num: '§3', title: '수행 의무', state: 'review', body: '수행사는 승인된 사업계획에 따라 프로그램을 제작·방영하고, 재단의 로고 및 지원 문구를 방송에 표출하여야 한다.' },
          { num: '§4', title: '정산 및 반납', state: 'approved', body: '수행사는 사업 종료 후 [정산보고제출기한]일 이내에 사업비 정산 보고서를 제출하며, 잔액은 재단에 반납한다.' },
        ],
      },
    },
  },

  예능: {
    '2자계약': {
      '마케팅 라이선스': {
        label: '예능 2자 마케팅 라이선스 패키지',
        ver: 'v3.1',
        tags: ['SBS-광고주', 'SBS-MC'],
        color: 'db-마케팅',
        iconBg: '#FEF3C7',
        iconStroke: '#B45309',
        aiSuggest: {
          title: 'SNS 2차 활용 권리 조항',
          reason: '📎 근거: \'예능 + 마케팅 라이선스\' 조건 감지',
          body: '광고주는 본 계약에서 허락된 범위 내에서 방송 영상을 SNS 채널에 2차 활용할 수 있으며, 활용 기간은 방송일로부터 6개월로 한다...',
        },
        clauses: [
          { num: '§1', title: '계약 목적', state: 'approved', body: '본 계약은 SBS(이하 "갑")와 광고주(이하 "을") 사이에 예능 프로그램을 활용한 마케팅 라이선스 패키지 서비스 제공에 관한 사항을 정한다.' },
          { num: '§2', title: '라이선스 범위', state: 'approved', body: '갑은 을에게 별지 기재 예능 프로그램의 출연자 이미지, 프로그램 로고, 방송 클립 영상의 마케팅 활용 권리를 부여한다.' },
          { num: '§3', title: '라이선스 대가', state: 'review', body: '을은 갑에게 라이선스 대가로 금 [라이선스대가]원(VAT 별도)을 지급한다. 지급 방법은 계약 체결 후 30일 이내 선급으로 한다.' },
          { num: '§4', title: '2차 저작물 제한', state: 'ai', body: '을은 허락된 범위를 초과하는 2차 저작물 제작, 재라이선스 부여, 제3자 양도를 금지한다. 위반 시 즉시 계약이 해지될 수 있다.' },
          { num: '§5', title: '광고 심의 준수', state: 'approved', body: '을은 갑의 브랜드 가이드라인 및 방송광고심의규정을 준수하여야 하며, 제작 전 갑의 사전 승인을 받아야 한다.' },
        ],
      },
    },
    '위수탁 계약': {
      '마케팅 라이선스': {
        label: '예능 위수탁 마케팅 라이선스 패키지',
        ver: 'v2.5',
        tags: ['MC-협찬주', 'SBS-MC'],
        color: 'db-마케팅',
        iconBg: '#FEF3C7',
        iconStroke: '#B45309',
        aiSuggest: {
          title: 'MC 초상권 별도 계약 안내',
          reason: '📎 근거: \'MC 위수탁 + 마케팅 라이선스\' 조건 감지',
          body: '본 계약에 포함된 MC 초상권 활용은 MC 개인과의 별도 초상권 계약을 전제로 하며, 해당 계약이 체결되지 않은 경우 본 계약의 효력은 MC 출연분에 한해 제한된다...',
        },
        clauses: [
          { num: '§1', title: '계약 목적', state: 'approved', body: '본 계약은 MC가 수탁자로서 협찬주에게 예능 프로그램 내 마케팅 라이선스 서비스를 제공하기 위한 권리·의무 관계를 규정한다.' },
          { num: '§2', title: '라이선스 내용', state: 'approved', body: '수탁 MC는 협찬주에게 본인의 초상, 성명, 방송 클립을 활용한 온오프라인 마케팅 소재 제작 권리를 제공한다.' },
          { num: '§3', title: '협찬 금액 및 정산', state: 'review', body: '협찬주는 별지에 기재된 금 [협찬금액]원을 지급하며, SBS는 대행 수수료를 공제한 후 잔액을 MC에게 지급한다. 간접가상 포함 시 별도 협의.' },
          { num: '§4', title: '메소디아 청약', state: 'ai', body: '간접가상일반이 포함되는 경우 메소디아 시스템을 통해 별도 청약 절차를 이행하여야 하며, 청약 완료 후 본 계약이 발효된다.' },
        ],
      },
      '협찬 계약서': {
        label: '예능 위수탁 협찬 계약서',
        ver: 'v1.9',
        tags: ['SBS-협찬주'],
        color: 'db-협찬',
        iconBg: '#DBEAFE',
        iconStroke: '#1E40AF',
        aiSuggest: {
          title: '협찬 노출 최소 보장 조항',
          reason: '📎 근거: \'예능 + SBS-협찬주 위수탁\' 조건 감지',
          body: '을은 갑의 협찬 물품을 해당 에피소드 내에서 최소 [최소노출횟수]회 이상 노출하여야 한다. 불가피한 사유로 미달 시 동등한 보완 노출 기회를 제공한다...',
        },
        clauses: [
          { num: '§1', title: '계약 목적', state: 'approved', body: '본 계약은 SBS와 협찬주 간 예능 프로그램 내 협찬 물품·서비스 노출에 관한 권리·의무를 규정한다.' },
          { num: '§2', title: '협찬 물품 및 서비스', state: 'approved', body: '협찬주는 별지에 기재된 물품·서비스를 제공하고, SBS는 해당 예능 프로그램 내에서 협찬 물품을 자연스럽게 노출한다.' },
          { num: '§3', title: '협찬 대가', state: 'review', body: 'SBS는 협찬 노출의 대가로 협찬주에게 별지 기재 금액을 청구한다. 협찬주는 계약 체결 후 [납부기한일수]일 이내에 납부한다.' },
          { num: '§4', title: '노출 횟수 보장', state: 'ai', body: 'SBS는 해당 에피소드 내에서 협찬 브랜드를 최소 [협찬노출최소횟수]회 이상 자연스럽게 노출하도록 최선을 다한다.' },
        ],
      },
    },
    '언진원 계약': {
      '마케팅 라이선스': {
        label: '예능 언진원 마케팅 라이선스',
        ver: 'v1.2',
        tags: ['SBS-언진'],
        color: 'db-마케팅',
        iconBg: '#FEF3C7',
        iconStroke: '#B45309',
        aiSuggest: {
          title: '공익 콘텐츠 활용 조항',
          reason: '📎 근거: \'언론진흥원 + 예능\' 조건 감지',
          body: '본 사업을 통해 제작된 예능 콘텐츠는 재단의 공익 목적 활용에 동의하며, 비상업적 교육·홍보 목적으로 재단이 활용할 수 있다...',
        },
        clauses: [
          { num: '§1', title: '약정 목적', state: 'approved', body: '본 약정은 언론진흥재단 지원을 활용한 예능 프로그램 내 마케팅 라이선스 서비스 제공에 관한 사항을 규정한다.' },
          { num: '§2', title: '지원 및 의무', state: 'review', body: '재단 지원금을 활용한 마케팅 콘텐츠 제작 시 재단 로고 표출 의무가 발생하며, 상업적 활용은 재단 사전 승인이 필요하다.' },
        ],
      },
    },
  },

  드라마: {
    // 추후 정의 예정
  },
};

/** One row for flat template grid (no separate 장르/형태/유형 steps in UI). */
export type FlatTemplateOption = {
  genre: Genre;
  formType: ContractFormType;
  doc: ContractDocType;
  template: ContractTemplate;
};

const GENRE_SORT: Genre[] = ['교양', '예능', '드라마'];

export function listFlatTemplateOptions(): FlatTemplateOption[] {
  const out: FlatTemplateOption[] = [];
  for (const genre of Object.keys(TEMPLATES) as Genre[]) {
    const byForm = TEMPLATES[genre];
    if (!byForm) continue;
    for (const formType of Object.keys(byForm) as ContractFormType[]) {
      const byDoc = byForm[formType];
      if (!byDoc) continue;
      for (const doc of Object.keys(byDoc) as ContractDocType[]) {
        const template = byDoc[doc];
        if (template) out.push({ genre, formType, doc, template });
      }
    }
  }
  out.sort((a, b) => {
    const ia = GENRE_SORT.indexOf(a.genre);
    const ib = GENRE_SORT.indexOf(b.genre);
    if (ia !== ib) return ia - ib;
    const pathA = `${a.formType} ${a.doc} ${a.template.label}`;
    const pathB = `${b.formType} ${b.doc} ${b.template.label}`;
    return pathA.localeCompare(pathB, 'ko');
  });
  return out;
}

// ─────────────────────────────────────────
// 장르별 계약형태 목록
// ─────────────────────────────────────────
export const TYPE_OPTIONS: Record<string, ContractFormType[]> = {
  교양: ['2자계약', '위수탁 계약', '언진원 계약'],
  예능: ['2자계약', '위수탁 계약', '언진원 계약'],
  드라마: ['2자계약', '위수탁 계약'],
};

// ─────────────────────────────────────────
// 계약서유형 메타 (아이콘, 설명)
// ─────────────────────────────────────────
export const DOC_OPTIONS = {
  '협찬 계약서':   { iconBg: '#DBEAFE', iconStroke: '#1E40AF', desc: '표준 협찬 약정' },
  '마케팅 라이선스': { iconBg: '#FEF3C7', iconStroke: '#B45309', desc: '마케팅 라이선스 패키지' },
  '대행 계약서':   { iconBg: '#F1F5F9', iconStroke: '#334155', desc: '광고·협찬 대행' },
  '정부 계약서':   { iconBg: '#DCFCE7', iconStroke: '#15803D', desc: '정부기관 약정' },
} as const;

export type DocOptionKey = keyof typeof DOC_OPTIONS;
