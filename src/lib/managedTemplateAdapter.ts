import { TEMPLATES } from '../data/templates';
import type {
  Clause,
  ContractFormType,
  ContractTemplate,
  Genre,
  TemplateSelection,
} from '../types/contract';
import type {
  TemplateAttachment,
  TemplateListItem,
  TemplateTone,
} from '../types/managedTemplate';
import { sanitizeClauseHtml } from './richClauseHtml';

const TEXT_MAX_CHARS = 800_000;
const HTML_MAX_CHARS = 1_200_000;
const DOCX_HIGHLIGHT_STYLE_MAP = [
  "highlight[color='yellow'] => mark.co-editable-highlight",
  "highlight[color='lightYellow'] => mark.co-editable-highlight",
];

const TEXT_EXT = new Set(['txt', 'md', 'html', 'htm', 'csv', 'json']);

export function isLikelyTextFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.startsWith('text/')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return TEXT_EXT.has(ext);
}

/** Word 2007+ (.docx) — 브라우저에서 mammoth로 본문 추출 */
export function isDocxFile(file: File): boolean {
  const t = (file.type || '').toLowerCase();
  if (t.includes('wordprocessingml')) return true;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ext === 'docx';
}

async function extractDocxPlainText(file: File): Promise<string | null> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const text = result.value?.trim();
    return text ? text : null;
  } catch {
    return null;
  }
}

async function extractDocxHtml(file: File): Promise<string | null> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: DOCX_HIGHLIGHT_STYLE_MAP,
      },
    );
    const html = sanitizeClauseHtml(result.value ?? '').trim();
    return html ? html : null;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export async function buildAttachmentFromFile(file: File): Promise<TemplateAttachment> {
  const base = {
    fileName: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
  };
  if (file.size > TEXT_MAX_CHARS * 2) {
    return base;
  }
  if (isLikelyTextFile(file)) {
    const text = await file.text();
    return { ...base, textContent: text.slice(0, TEXT_MAX_CHARS) };
  }
  if (isDocxFile(file)) {
    const original = await file.arrayBuffer();
    const [text, html] = await Promise.all([
      extractDocxPlainText(new File([original], file.name, { type: file.type })),
      extractDocxHtml(new File([original], file.name, { type: file.type })),
    ]);
    if (text || html) {
      return {
        ...base,
        originalDocxBase64: arrayBufferToBase64(original),
        ...(text ? { textContent: text.slice(0, TEXT_MAX_CHARS) } : {}),
        ...(html ? { htmlContent: html.slice(0, HTML_MAX_CHARS) } : {}),
      };
    }
  }
  return base;
}

function shouldAttemptLegalStructureParsing(text: string): boolean {
  // “제1장/제1조/제1항” 또는 “①②” 같은 법령형 번호 패턴이 보일 때만
  // 정교 파서를 시도하고, 그렇지 않으면 기존(빈줄) 분할을 유지합니다.
  // 주의: JS의 \b는 한글 앞뒤에서 기대대로 동작하지 않아 “제1조” 탐지가 실패할 수 있음.
  return (
    /제\s*\d+\s*(장|조|항)/.test(text) ||
    /[①-⑳]\s*/.test(text) ||
    /^제\s*\d+\s*항(?:\s|$)/m.test(text)
  );
}

function normalizeLegalText(text: string): string {
  let t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // “①” 같은 기호가 줄바꿈으로 쪼개지는 경우를 복구
  t = t.replace(/([①-⑳])\s*\n\s*/g, '$1 ');
  // “제1장”, “제1조”, “제1항” 키워드 뒤의 줄바꿈 복구
  t = t.replace(/(제\s*\d+\s*(장|조|항))\s*\n\s*/g, '$1 ');
  // 불필요한 공백/빈줄 정리
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t;
}

function splitLegalTextToClauses(text: string): Clause[] {
  const normalized = normalizeLegalText(text);
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chapterRe = /^제\s*(\d+)\s*장\s*(.*)$/;
  const articleRe =
    /^제\s*(\d+)\s*조\s*(?:\(([^)]*)\))?\s*(?:[:：\-\u2014])?\s*(.*)$/;
  const paraCircledRe = /^([①-⑳])\s*(.*)$/;
  const paraRe =
    /^제\s*(\d+)\s*항\s*(?:[:：\-\u2014])?\s*(.*)$/;

  const clauses: Clause[] = [];
  let currentChapter: string | null = null;
  let currentArticle: string | null = null;
  let lastClause: Clause | null = null;

  const buildTitle = (marker: string): string => {
    return [currentChapter, currentArticle, marker].filter(Boolean).join(' · ');
  };

  for (const p of paragraphs) {
    const ch = p.match(chapterRe);
    if (ch) {
      const no = ch[1]!;
      const rest = (ch[2] ?? '').trim();
      currentChapter = rest ? `제${no}장 ${rest}` : `제${no}장`;
      lastClause = null;
      continue;
    }

    const ar = p.match(articleRe);
    if (ar) {
      const no = ar[1]!;
      const paren = (ar[2] ?? '').trim();
      const rest = (ar[3] ?? '').trim();

      currentArticle = paren ? `제${no}조(${paren})` : `제${no}조`;
      lastClause = null;
      if (rest) {
        clauses.push({
          num: `§${clauses.length + 1}`,
          title: [currentChapter, currentArticle].filter(Boolean).join(' · '),
          state: 'review',
          body: rest,
        });
        lastClause = clauses[clauses.length - 1]!;
      }
      continue;
    }

    const pc = p.match(paraCircledRe);
    if (pc) {
      const marker = pc[1]!;
      const rest = (pc[2] ?? '').trim();
      const title = buildTitle(marker);

      clauses.push({
        num: `§${clauses.length + 1}`,
        title: title || `항 ${marker}`,
        state: 'review',
        body: rest || p,
      });
      lastClause = clauses[clauses.length - 1]!;
      continue;
    }

    const par = p.match(paraRe);
    if (par) {
      const marker = `제${par[1]!}항`;
      const rest = (par[2] ?? '').trim();
      const title = buildTitle(marker);

      clauses.push({
        num: `§${clauses.length + 1}`,
        title: title || marker,
        state: 'review',
        body: rest || p,
      });
      lastClause = clauses[clauses.length - 1]!;
      continue;
    }

    // 문단이 장/항 마커로 인식되지 않지만, 이전 항의 본문 일부일 가능성이 큼
    if (lastClause) {
      lastClause.body += `\n${p}`;
    } else {
      // 컨텍스트가 없으면 “업로드 본문”으로 보존
      clauses.push({
        num: `§${clauses.length + 1}`,
        title: currentArticle
          ? [currentChapter, currentArticle].filter(Boolean).join(' · ')
          : currentChapter
            ? currentChapter
            : '업로드 본문',
        state: 'review',
        body: p,
      });
      lastClause = clauses[clauses.length - 1]!;
    }
  }

  return clauses;
}

function splitLegalTextToClausesByArticle(text: string): Clause[] {
  // Requirement:
  // 1) “제1조, 제2조 등 조별”로 하나의 Clause에 묶어 편집 가능해야 함.
  // 2) “무조건 제1조 전의 내용”은 하나로 묶어야 함(첫 조 시작 전까지 누적).

  const normalized = normalizeLegalText(text);
  const paragraphs = normalized
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chapterRe = /^제\s*(\d+)\s*장\s*(.*)$/;
  const articleRe =
    /^제\s*(\d+)\s*조\s*(?:\(([^)]*)\))?\s*(?:[:：\-\u2014])?\s*(.*)$/;

  const clauses: Clause[] = [];
  let currentChapter: string | null = null;

  let seenFirstArticle = false;

  // “제1조 전”을 단일 Clause로 누적하기 위한 버퍼
  let preArticleBody: string[] = [];

  // 현재 조(Clause) 본문 누적
  let currentArticleNo: string | null = null;
  let currentArticleParen: string | null = null;
  let lastClauseBody: string[] = [];

  const flushArticle = () => {
    if (!currentArticleNo) return;
    const title = [
      currentChapter,
      `제${currentArticleNo}조${
        currentArticleParen ? `(${currentArticleParen})` : ''
      }`,
    ]
      .filter(Boolean)
      .join(' · ');

    const body = lastClauseBody.join('\n\n').trim();
    clauses.push({
      num: `§${clauses.length + 1}`,
      title,
      state: 'review',
      body: body || '(조 본문이 비어 있습니다.)',
    });

    lastClauseBody = [];
    currentArticleNo = null;
    currentArticleParen = null;
  };

  const flushPreArticle = () => {
    if (!preArticleBody.length) return;
    clauses.push({
      num: `§${clauses.length + 1}`,
      title: '부분 1',
      state: 'review',
      body: preArticleBody.join('\n\n').trim(),
    });
    preArticleBody = [];
  };

  for (const p of paragraphs) {
    const ch = p.match(chapterRe);
    if (ch) {
      const no = ch[1]!;
      const rest = (ch[2] ?? '').trim();
      currentChapter = rest ? `제${no}장 ${rest}` : `제${no}장`;

      // “제1조 전” 구간이면 장 제목도 함께 누적
      if (!seenFirstArticle) preArticleBody.push(p);
      continue;
    }

    const ar = p.match(articleRe);
    if (ar) {
      if (!seenFirstArticle) {
        flushPreArticle();
        seenFirstArticle = true;
      } else {
        flushArticle();
      }

      currentArticleNo = ar[1]!;
      currentArticleParen = (ar[2] ?? '').trim() || null;
      // 조 제목 줄(제N조 …)을 본문에 포함해 카드 헤더와 한 덩어리로 편집 가능하게 함
      lastClauseBody.push(p);
      continue;
    }

    if (!seenFirstArticle) {
      preArticleBody.push(p);
      continue;
    }

    // 조 본문(항/호 등)은 모두 현재 조에 누적
    if (currentArticleNo) {
      lastClauseBody.push(p);
      continue;
    }

    // 특이 케이스: 장/조 컨텍스트가 있는데도 currentArticleNo가 없는 경우
    // (보통 발생하지 않지만) “조 본문 전”으로 보존
    clauses.push({
      num: `§${clauses.length + 1}`,
      title: currentChapter ? `${currentChapter} · 조 본문 전` : '업로드 본문',
      state: 'review',
      body: p,
    });
  }

  if (!seenFirstArticle) {
    flushPreArticle();
  } else {
    flushArticle();
  }

  return clauses;
}

function normalizeForLegalHeading(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .trim();
}

function isStandaloneArticleHeading(text: string): boolean {
  const articleOnlyRe = /^제\s*\d+\s*조(?:\s*[\(\（][^)\）]*[\)\）])?\s*$/;
  const lines = normalizeForLegalHeading(text)
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length !== 1) return false;
  return articleOnlyRe.test(lines[0]!);
}

/**
 * 빈 줄 분할 결과에서 “제 N 조 (…)” 한 줄만 있는 블록과 바로 다음 블록(본문)을 합칩니다.
 * 다음 블록도 조 제목만 한 줄이면(제2조 등) 병합하지 않습니다.
 */
function mergeStandaloneArticleHeadingParts(parts: string[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const cur = parts[i]!.trim();
    if (isStandaloneArticleHeading(cur)) {
      const merged: string[] = [cur];
      let j = i + 1;
      while (j < parts.length && !isStandaloneArticleHeading(parts[j]!)) {
        merged.push(parts[j]!.trim());
        j += 1;
      }
      if (merged.length >= 2) {
        out.push(merged.join('\n\n'));
        i = j;
        continue;
      }
    }
    out.push(cur);
    i += 1;
  }
  return out;
}

/** 이미 저장된 조항에서 “조 제목 단독 조항 + 이어지는 본문 조항들”을 하나로 정규화합니다. */
function mergeStandaloneArticleHeadingClauses(clauses: Clause[]): Clause[] {
  let working = clauses.map((c) => ({ ...c }));
  const firstArticleIdx = working.findIndex((c) => isStandaloneArticleHeading(c.body));
  if (firstArticleIdx > 0) {
    const cover = working
      .slice(0, firstArticleIdx)
      .map((c) => c.body.trim())
      .filter(Boolean)
      .join('\n\n')
      .trim();
    if (cover) {
      const first = working[0]!;
      working = [
        {
          ...first,
          title: '부분 1',
          body: cover,
        },
        ...working.slice(firstArticleIdx),
      ];
    }
  }

  const out: Clause[] = [];
  let i = 0;
  while (i < working.length) {
    const cur = working[i]!;
    if (isStandaloneArticleHeading(cur.body)) {
      const mergedBody: string[] = [cur.body.trim()];
      let j = i + 1;
      while (j < working.length && !isStandaloneArticleHeading(working[j]!.body)) {
        mergedBody.push(working[j]!.body.trim());
        j += 1;
      }
      if (mergedBody.length >= 2) {
        out.push({
          ...cur,
          body: mergedBody.join('\n\n'),
        });
        i = j;
        continue;
      }
    }
    out.push({ ...cur });
    i += 1;
  }

  return out.map((c, idx) => ({ ...c, num: `§${idx + 1}` }));
}

/** 빈 줄 2개 이상으로 나누어 조항 후보 생성 */
export function splitUploadToClauses(text: string): Clause[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [
      {
        num: '§1',
        title: '본문',
        state: 'review' as const,
        body: '내용이 비어 있습니다.',
      },
    ];
  }

  if (shouldAttemptLegalStructureParsing(trimmed)) {
    // “제x조”가 있으면 조(제1조/제2조) 단위로 묶어서 Clause를 만듭니다.
    // 없으면 기존(항/마커 기반) 로직으로 폴백합니다.
    // JS 정규식의 \b(단어 경계)는 한글을 \w로 취급하지 않아서
    // `조\b` 패턴이 실패할 수 있습니다. 따라서 \b 없이 확인합니다.
    const hasArticle = /제\s*\d+\s*조/.test(trimmed);
    if (hasArticle) {
      const byArticle = splitLegalTextToClausesByArticle(trimmed);
      if (byArticle.length >= 1) return byArticle;
    }

    const legal = splitLegalTextToClauses(trimmed);
    // 마커 기반으로 쪼개졌을 때만 “장/항 파싱 결과”를 우선 적용
    if (legal.length >= 2) return legal;
  }

  const parts = mergeStandaloneArticleHeadingParts(
    trimmed.split(/\n{2,}/).filter(Boolean),
  );
  if (parts.length === 1) {
    return [
      {
        num: '§1',
        title: '업로드 본문',
        state: 'review' as const,
        body: parts[0],
      },
    ];
  }

  return parts.map((block, i) => {
    const lines = block.split('\n');
    const first = lines[0]?.trim() ?? '';
    const useTitle =
      first.length > 0 && first.length <= 100 && lines.length > 1;
    const body = useTitle ? lines.slice(1).join('\n').trim() : block;
    return {
      num: `§${i + 1}`,
      title: useTitle ? first : `부분 ${i + 1}`,
      state: 'review' as const,
      body: body || block,
    };
  });
}

/** 첨부 본문을 편집기 조항으로 변환 (docx html 우선). */
export function buildClausesFromAttachment(
  attachment: TemplateAttachment,
): Clause[] {
  if (attachment.htmlContent && attachment.htmlContent.trim()) {
    return [
      {
        num: '§1',
        title: '원본 서식(표 포함)',
        state: 'review',
        body: sanitizeClauseHtml(attachment.htmlContent),
        bodyFormat: 'html',
      },
    ];
  }
  if (attachment.textContent && attachment.textContent.trim()) {
    return mergeStandaloneArticleHeadingClauses(
      splitUploadToClauses(attachment.textContent),
    );
  }
  return [];
}

function toneToTemplateColors(tone: TemplateTone): {
  iconBg: string;
  iconStroke: string;
  color: ContractTemplate['color'];
} {
  switch (tone) {
    case 'info':
      return { iconBg: '#E0F2FE', iconStroke: '#0369A1', color: 'db-협찬' };
    case 'success':
      return { iconBg: '#DCFCE7', iconStroke: '#15803D', color: 'db-정부' };
    case 'warning':
      return { iconBg: '#FEF3C7', iconStroke: '#B45309', color: 'db-마케팅' };
    case 'neutral':
      return { iconBg: '#F1F5F9', iconStroke: '#64748B', color: 'db-대행' };
    default:
      return { iconBg: '#DBEAFE', iconStroke: '#1E40AF', color: 'db-협찬' };
  }
}

const PLACEHOLDER_HINT_NO_ATTACHMENT =
  '파일을 업로드하거나 조항을 직접 추가하세요.';

export function hintBodyForNonExtractableAttachment(fileName: string): string {
  return `업로드 파일「${fileName}」은(는) 이 환경에서 본문을 자동 추출할 수 없습니다. Word·PDF 등은 서버 변환 API 연동 후 사용할 수 있습니다. 아래에서 조항을 직접 작성하세요.`;
}

/** 관리 템플릿에 본문이 없을 때 넣는 단일 안내 조항인지 (표준 매트릭스 폴백 대상) */
export function isPlaceholderFallbackClauses(clauses: Clause[]): boolean {
  if (clauses.length !== 1) return false;
  const c = clauses[0]!;
  if (c.title !== '초안') return false;
  if (c.body === PLACEHOLDER_HINT_NO_ATTACHMENT) return true;
  if (c.body.startsWith('업로드 파일「')) return true;
  return false;
}

export function resolveClausesFromManagedItem(item: TemplateListItem): Clause[] {
  if (item.clausesAuthoritative === true && item.clauses?.length) {
    return mergeStandaloneArticleHeadingClauses(item.clauses);
  }
  if (item.attachment) {
    const fromAttachment = buildClausesFromAttachment(item.attachment);
    if (fromAttachment.length) return fromAttachment;
  }
  if (item.clauses?.length) {
    return mergeStandaloneArticleHeadingClauses(item.clauses);
  }
  const hint = item.attachment
    ? hintBodyForNonExtractableAttachment(item.attachment.fileName)
    : PLACEHOLDER_HINT_NO_ATTACHMENT;
  return [
    {
      num: '§1',
      title: '초안',
      state: 'review' as const,
      body: hint,
    },
  ];
}

function resolveBuiltinTemplate(
  sel: Pick<TemplateSelection, 'genre' | 'type' | 'doc'>,
): ContractTemplate | null {
  if (!sel.genre || !sel.type || !sel.doc) return null;
  return TEMPLATES[sel.genre]?.[sel.type]?.[sel.doc] ?? null;
}

/** linkedDocType(·linkedGenre)에 맞는 표준 매트릭스 조항 — 위저드 미선택 시 사용 */
export function findBuiltinClausesForManagedItem(
  item: TemplateListItem,
): Clause[] | null {
  if (!item.linkedDocType) return null;
  const doc = item.linkedDocType;
  const genres = (Object.keys(TEMPLATES) as Genre[]).filter(
    (g) => !item.linkedGenre || item.linkedGenre === g,
  );
  for (const genre of genres) {
    const group = TEMPLATES[genre];
    if (!group) continue;
    for (const form of Object.keys(group) as ContractFormType[]) {
      const t = group[form]?.[doc];
      if (t?.clauses?.length) {
        return t.clauses.map((c) => ({ ...c }));
      }
    }
  }
  return null;
}

/**
 * 관리 항목 조항 → 없으면 ①②③ 선택에 맞는 표준 템플릿 → 없으면 linkedDocType 기준 첫 매칭.
 */
export function resolveClausesFromManagedItemWithFallbacks(
  item: TemplateListItem,
  matrixSelection: Pick<TemplateSelection, 'genre' | 'type' | 'doc'> | null,
): Clause[] {
  const raw = resolveClausesFromManagedItem(item);
  if (!isPlaceholderFallbackClauses(raw)) {
    return raw;
  }
  /** 업로드는 했으나 본문 미추출(PDF 등) — 매트릭스 폴백으로 덮어쓰지 않음 */
  if (item.attachment && !item.attachment.textContent) {
    return raw;
  }
  const fromWizard = matrixSelection
    ? resolveBuiltinTemplate(matrixSelection)
    : null;
  if (fromWizard?.clauses?.length) {
    return fromWizard.clauses.map((c) => ({ ...c }));
  }
  const fromLinked = findBuiltinClausesForManagedItem(item);
  if (fromLinked?.length) {
    return fromLinked;
  }
  return raw;
}

export type MatrixWizardPick = Pick<
  TemplateSelection,
  'genre' | 'type' | 'doc'
>;

/** 현재 ①②③ 선택에 맞는 템플릿 관리 후보(활성·유형 연결·장르 호환) */
export function listManagedCandidatesForSelection(
  sel: MatrixWizardPick,
  items: TemplateListItem[],
): TemplateListItem[] {
  if (!sel.doc) return [];
  return items
    .filter(
      (i) =>
        i.status === 'active' &&
        i.linkedDocType === sel.doc &&
        (i.linkedFormType == null || i.linkedFormType === sel.type) &&
        (sel.genre == null ||
          i.linkedGenre == null ||
          i.linkedGenre === sel.genre),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 자동 추천(단일 후보 UX 등) — 명시 선택은 matrixClauseSourceId 사용 */
export function findManagedTemplateForSelection(
  sel: MatrixWizardPick,
  items: TemplateListItem[],
): TemplateListItem | null {
  const list = listManagedCandidatesForSelection(sel, items);
  if (!list.length) return null;
  if (sel.genre) {
    const exact = list.find((i) => i.linkedGenre === sel.genre);
    if (exact) return exact;
  }
  const anyGenre = list.find((i) => i.linkedGenre == null);
  return anyGenre ?? list[0] ?? null;
}

export function managedItemToContractTemplate(
  item: TemplateListItem,
): ContractTemplate {
  const colors = toneToTemplateColors(item.tone);
  const clauses = resolveClausesFromManagedItemWithFallbacks(item, null);
  return {
    label: item.name,
    ver: item.ver,
    tags: ['관리 템플릿'],
    color: colors.color,
    iconBg: colors.iconBg,
    iconStroke: colors.iconStroke,
    aiSuggest: {
      title: '업로드 문서 정리',
      reason: '관리 템플릿에서 불러온 계약입니다. 조항 단위로 다듬을 수 있습니다.',
      body: '법무 검토 전까지 표현을 통일하고, 플레이스홀더 [  ]를 채워 주세요.',
    },
    clauses,
  };
}
