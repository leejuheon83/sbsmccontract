import type { Clause } from '../types/contract';

export type ToxicSeverity = 'critical' | 'warning' | 'info';

export interface ToxicClauseIssue {
  clauseIndex: number;
  clauseTitle: string;
  severity: ToxicSeverity;
  category: string;
  matched: string;
  description: string;
  suggestion: string;
}

interface DetectionRule {
  category: string;
  severity: ToxicSeverity;
  patterns: RegExp[];
  description: string;
  suggestion: string;
}

const RULES: DetectionRule[] = [
  {
    category: '일방적 해지권',
    severity: 'critical',
    patterns: [
      /일방[적으로]*\s*(?:해지|해제|종료|철회)/,
      /(?:즉시|무조건)\s*(?:해지|해제|종료)/,
      /(?:통보|통지)\s*(?:만으로|없이)\s*(?:해지|해제|종료)/,
      /사전\s*(?:통보|통지|동의)\s*없이\s*(?:해지|해제|종료|변경)/,
    ],
    description:
      '일방적으로 계약을 해지할 수 있는 조항은 상대방에게 불리하며 분쟁 소지가 있습니다.',
    suggestion:
      '쌍방 합의 또는 서면 통보 후 일정 기간(예: 30일) 경과 후 해지로 수정하는 것을 권장합니다.',
  },
  {
    category: '과도한 위약금',
    severity: 'critical',
    patterns: [
      /위약금[^.]*(?:전액|100\s*%|2배|3배|배액)/,
      /손해배상[^.]*(?:전액|무제한|일체)/,
      /(?:계약금|대금)[^.]*(?:전액\s*(?:몰수|반환[^.]* 않|포기))/,
      /(?:총\s*)?(?:계약|대금|사용료)[^.]*(?:200|300|[2-9])\s*%/,
    ],
    description:
      '과도한 위약금 또는 손해배상 조항은 불공정 약관으로 판단될 수 있습니다.',
    suggestion:
      '실제 손해액 범위 내에서의 배상 또는 계약금액의 일정 비율(예: 10~20%)로 상한을 두는 것을 권장합니다.',
  },
  {
    category: '면책 범위 과다',
    severity: 'critical',
    patterns: [
      /(?:일체|모든|어떠한)\s*(?:책임|의무)[^.]*(?:지지\s*않|면제|부담하지\s*않|없)/,
      /(?:간접|결과적|특별)\s*손해[^.]*(?:책임[^.]*(?:없|면제|제외))/,
      /(?:하자|결함|오류)[^.]*(?:보증|보장)[^.]*(?:않|없|제외|면제)/,
    ],
    description:
      '일체의 책임을 면제하는 조항은 계약 목적 달성을 저해할 수 있습니다.',
    suggestion:
      '구체적인 면책 사유를 명시하고, 고의·중과실에 대한 책임은 유지하도록 수정을 권장합니다.',
  },
  {
    category: '일방적 변경권',
    severity: 'warning',
    patterns: [
      /(?:임의|단독)[으로]*\s*(?:변경|수정|조정)/,
      /사전\s*(?:동의|협의|합의)\s*없이[^.]*(?:변경|수정|조정)/,
      /(?:통보|통지)\s*(?:만으로|없이)[^.]*(?:변경|수정|조정)/,
    ],
    description:
      '상대방 동의 없이 계약 내용을 변경할 수 있는 조항은 형평성에 어긋납니다.',
    suggestion:
      '변경 시 상대방의 사전 서면 동의를 받도록 수정하고, 합리적 사유를 명시하는 것을 권장합니다.',
  },
  {
    category: '자동 갱신 조건 불리',
    severity: 'warning',
    patterns: [
      /자동[으로]*\s*(?:갱신|연장|계속)/,
      /(?:별도|서면)\s*(?:통지|통보)\s*(?:없[는으]면|하지\s*않[는으]면)[^.]*(?:갱신|연장)/,
    ],
    description:
      '자동 갱신 조항은 해지 기회를 놓칠 경우 의도치 않은 계약 연장이 발생합니다.',
    suggestion:
      '갱신 거절 통보 기한을 명확히 하고, 양 당사자 모두에게 갱신 거절권을 부여하는 것을 권장합니다.',
  },
  {
    category: '지식재산권 귀속 편향',
    severity: 'warning',
    patterns: [
      /(?:일체|모든|전부)[의의]*\s*(?:지적재산권|저작권|지식재산권|IP|특허)[^.]*(?:귀속|소유|양도)/,
      /(?:저작인격권|성명표시권)[^.]*(?:행사[^.]*않|포기|불행사)/,
    ],
    description:
      '지식재산권의 일방 귀속은 창작물에 대한 정당한 권리를 침해할 수 있습니다.',
    suggestion:
      '공동 저작물의 경우 공동 소유 또는 사용권 허여 방식으로 조정하는 것을 권장합니다.',
  },
  {
    category: '비밀유지 기간 과다',
    severity: 'info',
    patterns: [
      /비밀유지[^.]*(?:영구|무기한|기한\s*없[이는])/,
      /(?:기밀|비밀)[^.]*(?:10년|20년|영구적)/,
    ],
    description:
      '지나치게 긴 비밀유지 의무는 이행 감시가 어렵고 실효성이 낮습니다.',
    suggestion:
      '비밀유지 기간을 계약 종료 후 2~5년으로 제한하는 것이 일반적입니다.',
  },
  {
    category: '관할 법원 지정',
    severity: 'info',
    patterns: [
      /(?:전속|독점)[적]*\s*(?:관할|재판)[^.]*(?:법원|법정)/,
      /(?:소송|분쟁)[^.]*(?:전속\s*관할)/,
    ],
    description:
      '특정 법원 전속 관할 지정은 상대방의 재판 접근성을 제한할 수 있습니다.',
    suggestion:
      '피고 주소지 관할 원칙을 따르거나 조정·중재를 우선 적용하는 것을 검토해 주세요.',
  },
  {
    category: '경쟁 제한 조항',
    severity: 'warning',
    patterns: [
      /(?:경쟁\s*(?:업체|사업|회사))[^.]*(?:금지|제한|불가)/,
      /(?:경업|겸업)\s*금지/,
      /(?:동종|유사)\s*(?:업종|사업|영업)[^.]*(?:금지|제한)/,
    ],
    description:
      '과도한 경쟁 제한 조항은 영업의 자유를 침해할 수 있습니다.',
    suggestion:
      '경쟁 제한 범위(기간·지역·업종)를 합리적으로 한정하고, 보상 조건을 명시하는 것을 권장합니다.',
  },
  {
    category: '지체상금 과다',
    severity: 'warning',
    patterns: [
      /지체상금[^.]*(?:일[^.]*(?:0\.\d{2,}|1[%％]|[2-9]|[1-9]\d)\s*[%％])/,
      /지체[^.]*(?:계약금액|총액)[^.]*(?:[5-9]|[1-9]\d)\s*[%％]/,
    ],
    description:
      '지체상금률이 과도하면 불공정 계약으로 판단될 수 있습니다.',
    suggestion:
      '지체상금률은 일 0.1% 이내, 총 한도 계약금액의 10% 이하가 일반적 기준입니다.',
  },
];

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function detectToxicClauses(clauses: Clause[]): ToxicClauseIssue[] {
  const issues: ToxicClauseIssue[] = [];

  clauses.forEach((clause, idx) => {
    const plainText =
      clause.bodyFormat === 'html' ? stripHtmlTags(clause.body) : clause.body;

    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        const match = plainText.match(pattern);
        if (match) {
          issues.push({
            clauseIndex: idx,
            clauseTitle: clause.title || `${clause.num}`,
            severity: rule.severity,
            category: rule.category,
            matched: match[0],
            description: rule.description,
            suggestion: rule.suggestion,
          });
          break;
        }
      }
    }
  });

  return issues;
}

export function severityLabel(s: ToxicSeverity): string {
  switch (s) {
    case 'critical':
      return '위험';
    case 'warning':
      return '주의';
    case 'info':
      return '참고';
  }
}

export function severityColor(s: ToxicSeverity): {
  bg: string;
  text: string;
  border: string;
  icon: string;
} {
  switch (s) {
    case 'critical':
      return {
        bg: 'bg-red-50',
        text: 'text-red-800',
        border: 'border-red-200',
        icon: 'text-red-500',
      };
    case 'warning':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-800',
        border: 'border-amber-200',
        icon: 'text-amber-500',
      };
    case 'info':
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        icon: 'text-blue-400',
      };
  }
}
