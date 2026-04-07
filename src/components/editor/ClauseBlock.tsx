import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent,
} from 'react';
import type { Clause } from '../../types/contract';
import { useAppStore } from '../../store/useAppStore';
import {
  mergeStrippedClauseBodyWithTitleLine,
  stripLeadingTitleFromBodyIfDuplicate,
} from '../../lib/clausePlaceholders';
import {
  countYellowEditableHighlightsInHtml,
  markYellowHighlightsEditable,
  sanitizeClauseHtml,
  stripEditableHighlightMarkers,
} from '../../lib/richClauseHtml';
import { renderClauseBodyWithParagraphs } from './renderBodyWithFields';

function stateStyles(state: Clause['state']) {
  switch (state) {
    case 'approved':
      return {
        wrap: 'border-success-300',
        head: 'bg-success-100',
        badge: (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-semibold text-success-700">
            <span className="h-[5px] w-[5px] rounded-full bg-success-700" />
            승인됨
          </span>
        ),
      };
    case 'review':
      return {
        wrap: 'border-warning-300',
        head: 'bg-warning-100',
        badge: (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-[10px] font-semibold text-warning-700">
            <span className="h-[5px] w-[5px] rounded-full bg-warning-700" />
            검토 필요
          </span>
        ),
      };
    case 'ai':
      return {
        wrap: 'border-info-300',
        head: 'bg-info-100',
        badge: (
          <span className="inline-block rounded bg-info-100 px-1.5 py-px text-[10px] font-semibold text-info-700">
            AI 제안
          </span>
        ),
      };
  }
}

export function ClauseBlock({
  clause,
  index,
  readOnly = false,
}: {
  clause: Clause;
  index: number;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(clause.body);
  const [htmlHighlightFields, setHtmlHighlightFields] = useState<
    Array<{ id: string; value: string }>
  >([]);
  const richEditorRef = useRef<HTMLDivElement | null>(null);
  /** 노란 하이라이트 없이 본문 직접 편집 시 clause.body 동기화로 인한 innerHTML 재적용 방지 */
  const skipNextPlainSyncRef = useRef(false);
  const updateClauseBody = useAppStore((s) => s.updateClauseBody);
  const recordClauseEdit = useAppStore((s) => s.recordClauseEdit);
  const st = stateStyles(clause.state);
  const auditTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    },
    [],
  );

  const scheduleClauseAudit = () => {
    if (auditTimerRef.current) clearTimeout(auditTimerRef.current);
    auditTimerRef.current = setTimeout(() => {
      recordClauseEdit(clause.title);
      auditTimerRef.current = null;
    }, 850);
  };

  useEffect(() => {
    if (!editing) setDraft(clause.body);
  }, [clause.body, editing]);

  /**
   * HTML 본문: ref에만 콘텐츠를 넣고, 노란 하이라이트가 있으면 clause.body 변경 시마다 동기(실시간 미리보기·Word 내보내기).
   * 하이라이트 없이 직접 타이핑할 때는 innerHTML 재적용으로 커서가 튀지 않도록 skip 사용.
   */
  useLayoutEffect(() => {
    if (!editing || clause.bodyFormat !== 'html') return;
    const root = richEditorRef.current;
    if (!root) return;

    const nHighlights = countYellowEditableHighlightsInHtml(clause.body);

    if (nHighlights > 0) {
      root.innerHTML = markYellowHighlightsEditable(clause.body);
      const editableNodes = Array.from(
        root.querySelectorAll<HTMLElement>('[data-editable-highlight="1"]'),
      );
      root.contentEditable = 'false';
      editableNodes.forEach((node, i) => {
        const id = `h-${i + 1}`;
        node.contentEditable = 'false';
        node.setAttribute('data-highlight-id', id);
      });
      setHtmlHighlightFields(
        editableNodes.map((node, i) => ({
          id: `h-${i + 1}`,
          value: node.textContent ?? '',
        })),
      );
      return;
    }

    setHtmlHighlightFields([]);
    if (skipNextPlainSyncRef.current) {
      skipNextPlainSyncRef.current = false;
      root.contentEditable = 'true';
      return;
    }
    root.innerHTML = markYellowHighlightsEditable(clause.body);
    root.contentEditable = 'true';
  }, [editing, clause.bodyFormat, clause.body]);

  const toggle = () => setOpen((o) => !o);

  const startEdit = (e: MouseEvent) => {
    e.stopPropagation();
    skipNextPlainSyncRef.current = false;
    setDraft(clause.bodyFormat === 'html' ? sanitizeClauseHtml(clause.body) : clause.body);
    setEditing(true);
  };

  const finishEdit = (e: MouseEvent) => {
    e.stopPropagation();
    const next =
      clause.bodyFormat === 'html'
        ? sanitizeClauseHtml(
            stripEditableHighlightMarkers(richEditorRef.current?.innerHTML ?? draft),
          )
        : draft;
    updateClauseBody(index, next);
    recordClauseEdit(clause.title);
    setEditing(false);
  };

  const handleHtmlHighlightFieldChange = (id: string, nextValue: string) => {
    const root = richEditorRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(
      `[data-highlight-id="${id}"]`,
    );
    if (!target) return;
    target.textContent = nextValue;
    setHtmlHighlightFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, value: nextValue } : f)),
    );
    const nextBody = stripEditableHighlightMarkers(
      sanitizeClauseHtml(root.innerHTML),
    );
    updateClauseBody(index, nextBody);
    scheduleClauseAudit();
  };

  const handleHtmlRichEditorInput = () => {
    const root = richEditorRef.current;
    if (!root) return;
    skipNextPlainSyncRef.current = true;
    const nextBody = stripEditableHighlightMarkers(
      sanitizeClauseHtml(root.innerHTML),
    );
    updateClauseBody(index, nextBody);
    setDraft(root.innerHTML);
    scheduleClauseAudit();
  };

  return (
    <div
      className={`mb-2.5 overflow-hidden rounded-lg border bg-white ${st.wrap}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(ev) => {
          if (ev.key === 'Enter' || ev.key === ' ') toggle();
        }}
        className={`flex w-full cursor-pointer items-center gap-2.5 px-3.5 py-2.5 text-left transition-colors hover:bg-neutral-50 ${st.head}`}
      >
        <span className="font-mono text-xs font-bold text-neutral-400">
          {clause.num}
        </span>
        <span className="flex-1 text-[13px] font-semibold text-neutral-900">
          {clause.title}
        </span>
        {st.badge}
        <div className="ml-auto flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {readOnly ? null : editing ? (
            <button
              type="button"
              onClick={finishEdit}
              className="rounded-md border border-primary-300 bg-white px-2 py-0.5 text-[11px] font-medium text-primary-800 hover:bg-primary-50"
            >
              완료
            </button>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="rounded-md border border-neutral-200 bg-white px-2 py-0.5 text-[11px] text-neutral-500 hover:bg-neutral-100"
            >
              편집
            </button>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`shrink-0 text-neutral-400 transition-transform ${open ? '' : '-rotate-90'}`}
            aria-hidden
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      {open ? (
        editing ? (
          clause.bodyFormat === 'html' ? (
            <div className="border-t border-neutral-100 bg-primary-50 px-3.5 py-3">
              <div
                className={
                  htmlHighlightFields.length > 0
                    ? 'grid gap-3 tablet:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]'
                    : ''
                }
              >
                <div
                  ref={richEditorRef}
                  suppressContentEditableWarning
                  className="clause-rich-body min-h-[160px] rounded-md border border-primary-300 bg-white p-3 text-[13px] text-neutral-800 outline-none ring-2 ring-primary-400/30 focus:ring-primary-500/50"
                  onInput={
                    htmlHighlightFields.length === 0 ? handleHtmlRichEditorInput : undefined
                  }
                />
                {htmlHighlightFields.length > 0 ? (
                  <div className="rounded-md border border-warning-300 bg-warning-50 p-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-warning-800">
                      노란색 하이라이트 수정 컬럼
                    </p>
                    <div className="max-h-[280px] overflow-auto pr-1">
                      {htmlHighlightFields.map((field, i) => (
                        <label
                          key={field.id}
                          className="mb-2.5 block text-[11px] text-neutral-600"
                        >
                          항목 {i + 1}
                          <input
                            type="text"
                            value={field.value}
                            onChange={(ev) =>
                              handleHtmlHighlightFieldChange(
                                field.id,
                                ev.target.value,
                              )
                            }
                            className="mt-1 w-full rounded-md border border-warning-300 bg-white px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                노란색 표시가 있으면 오른쪽 컬럼에서만 수정됩니다. (없으면 전체 편집)
              </p>
            </div>
          ) : (
            <textarea
              className="w-full resize-y border-t border-neutral-100 bg-primary-50 px-3.5 py-3 font-sans text-[13px] leading-relaxed text-neutral-700 ring-2 ring-inset ring-primary-400 focus:outline-none"
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
          )
        ) : (
          <div className="border-t border-neutral-100 px-3.5 py-3">
            {clause.bodyFormat === 'html' ? (
              <div
                className="clause-rich-body"
                dangerouslySetInnerHTML={{
                  __html: sanitizeClauseHtml(clause.body),
                }}
              />
            ) : (
              renderClauseBodyWithParagraphs({
                body: stripLeadingTitleFromBodyIfDuplicate(
                  clause.body,
                  clause.title,
                ),
                getBody: () =>
                  stripLeadingTitleFromBodyIfDuplicate(
                    useAppStore.getState().clauses[index]?.body ?? clause.body,
                    clause.title,
                  ),
                onBodyChange: (next) => {
                  const storeBody =
                    useAppStore.getState().clauses[index]?.body ?? clause.body;
                  updateClauseBody(
                    index,
                    mergeStrippedClauseBodyWithTitleLine(
                      next,
                      storeBody,
                      clause.title,
                    ),
                  );
                },
                onFieldsEdited: scheduleClauseAudit,
                keyPrefix: `c-${index}`,
                readOnly,
              })
            )}
          </div>
        )
      ) : null}
    </div>
  );
}
