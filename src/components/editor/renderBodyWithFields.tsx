import type { ReactNode } from 'react';
import {
  joinParagraphs,
  placeholderAriaLabel,
  placeholderInner,
  replaceNthPlaceholder,
  splitBodyIntoParagraphs,
  splitClauseBody,
} from '../../lib/clausePlaceholders';

export type RenderBodyWithFieldsParams = {
  /** 조항 본문 원문 */
  body: string;
  /** 치환 시 최신 문자열 (예: 스토어에서 조회) */
  getBody: () => string;
  onPlaceholderChange: (nextBody: string) => void;
  /** 입력 직후 호출(디바운스된 감사 등) */
  onFieldsEdited?: () => void;
  keyPrefix?: string;
  /** 검토 열람 등 — 플레이스홀더 입력 비활성 */
  readOnly?: boolean;
};

/**
 * `[변수명]`, `[  ]` 등 대괄호 플레이스홀더를 인라인 입력 필드로 렌더하고,
 * 그 외 구간은 읽기 전용 텍스트로 둡니다.
 */
export function renderBodyWithFields({
  body,
  getBody,
  onPlaceholderChange,
  onFieldsEdited,
  keyPrefix = 'fld',
  readOnly = false,
}: RenderBodyWithFieldsParams): ReactNode {
  const segments = splitClauseBody(body);
  let placeholderOrdinal = 0;

  return (
    <div className="clause-body">
      {segments.map((seg, si) => {
        if (seg.kind === 'text') {
          return (
            <span key={`${keyPrefix}-t-${si}`} className="clause-body__static">
              {seg.text}
            </span>
          );
        }
        const phIdx = placeholderOrdinal++;
        const inner = placeholderInner(seg.raw);
        const widthCh = Math.min(40, Math.max(8, inner.length + 3));
        if (readOnly) {
          return (
            <span
              key={`${keyPrefix}-p-${si}-${phIdx}`}
              className="clause-body__static rounded border border-neutral-200 bg-neutral-50 px-1 text-neutral-700"
              title={placeholderAriaLabel(seg.raw)}
            >
              [{inner || ' '}]
            </span>
          );
        }
        return (
          <input
            key={`${keyPrefix}-p-${si}-${phIdx}`}
            type="text"
            aria-label={placeholderAriaLabel(seg.raw)}
            title={placeholderAriaLabel(seg.raw)}
            value={inner}
            style={{ width: `${widthCh}ch`, minWidth: '8ch' }}
            className="clause-body__field"
            onChange={(e) => {
              const latest = getBody();
              onPlaceholderChange(
                replaceNthPlaceholder(latest, phIdx, e.target.value),
              );
              onFieldsEdited?.();
            }}
          />
        );
      })}
    </div>
  );
}

export type RenderClauseBodyWithParagraphsParams = Omit<
  RenderBodyWithFieldsParams,
  'onPlaceholderChange'
> & {
  onBodyChange: (nextBody: string) => void;
};

/**
 * 본문을 빈 줄 단위 단락으로 나누어 각 단락마다 플레이스홀더 필드를 독립 적용합니다.
 */
export function renderClauseBodyWithParagraphs({
  body,
  getBody,
  onBodyChange,
  onFieldsEdited,
  keyPrefix = 'fld',
  readOnly = false,
}: RenderClauseBodyWithParagraphsParams): ReactNode {
  const paragraphs = splitBodyIntoParagraphs(body);
  return (
    <div className="clause-body clause-body--paragraphs">
      {paragraphs.map((para, pi) => (
        <div key={`${keyPrefix}-para-${pi}`} className="clause-body__paragraph">
          {renderBodyWithFields({
            body: para,
            getBody: () => {
              const full = getBody();
              const ps = splitBodyIntoParagraphs(full);
              return ps[pi] ?? '';
            },
            onPlaceholderChange: (nextPara) => {
              const full = getBody();
              const ps = [...splitBodyIntoParagraphs(full)];
              ps[pi] = nextPara;
              onBodyChange(joinParagraphs(ps));
            },
            onFieldsEdited,
            keyPrefix: `${keyPrefix}-p${pi}`,
            readOnly,
          })}
        </div>
      ))}
    </div>
  );
}
