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
  applyPlainHighlightValuesToClauseHtml,
  applySidebarHighlightValuesToRichEditorHtml,
  countYellowEditableHighlightsInHtml,
  markYellowHighlightsEditable,
  sanitizeClauseHtml,
  stripEditableHighlightMarkers,
} from '../../lib/richClauseHtml';
import {
  hasPackClauseSegments,
  parsePackClauseSegments,
  rebuildHtmlWithPackSelection,
} from '../../lib/packClauseSegments';
import {
  applyPackRunRanksToFieldValues,
  applyEditableHighlightPackRunsToHtml,
  previewEditableHighlightPackRunsToHtml,
  buildHighlightSidebarRows,
  computeEditableHighlightPackRuns,
} from '../../lib/highlightPackApply';
import { reconcilePackRunSelections } from '../../lib/reconcilePackRunSelections';
import { ClausePackCheckboxEditor } from './ClausePackCheckboxEditor';
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
  /** onChange에서 클로저가 아닌 최신 필드 기준으로 DOM·store 동기화 */
  const htmlHighlightFieldsRef = useRef<Array<{ id: string; value: string }>>(
    [],
  );
  /** 노란 박스 정의: 체크한 항목만 본문에 남김(편집 완료 시). 순서 = 체크 순서 */
  const [packPickIndices, setPackPickIndices] = useState<number[]>([]);
  /** 하이라이트 컬럼: 연속 번호 정의 박스를 묶은 run + 그 외 solo id */
  const [highlightPackPlan, setHighlightPackPlan] = useState<{
    packRuns: string[][];
    soloIds: string[];
  }>({ packRuns: [], soloIds: [] });
  /** 각 pack run에서 체크·순서 유지용 id 배열 (문서 순서로 초기화) */
  const [packRunSelections, setPackRunSelections] = useState<string[][]>([]);
  const highlightPackPlanRef = useRef(highlightPackPlan);
  const packRunSelectionsRef = useRef(packRunSelections);
  highlightPackPlanRef.current = highlightPackPlan;
  packRunSelectionsRef.current = packRunSelections;
  const richEditorRef = useRef<HTMLDivElement | null>(null);
  /** 노란 하이라이트 없이 본문 직접 편집 시 clause.body 동기화로 인한 innerHTML 재적용 방지 */
  const skipNextPlainSyncRef = useRef(false);
  /**
   * 사이드바 동기화 직후 저장된 body값. clause.body와 일치하는 동안은
   * useLayoutEffect에서 innerHTML 재적용을 건너뜁니다.
   * startEdit 호출 시 null로 초기화됩니다.
   */
  const pendingSidebarSyncedBodyRef = useRef<string | null>(null);
  const leftPaneScrollRef = useRef<HTMLDivElement | null>(null);
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

  useEffect(() => {
    htmlHighlightFieldsRef.current = htmlHighlightFields;
  }, [htmlHighlightFields]);

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
      // 사이드바 조작으로 저장한 body와 일치하는 동안은 innerHTML 재적용을 건너뜁니다.
      // (체크/순서 변경 후 DOM이 이미 최신 상태이므로 재초기화하면 안 됨)
      if (
        pendingSidebarSyncedBodyRef.current !== null &&
        clause.body === pendingSidebarSyncedBodyRef.current
      ) {
        return;
      }
      pendingSidebarSyncedBodyRef.current = null;
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
      {
        const nextFields = editableNodes.map((node, i) => ({
          id: `h-${i + 1}`,
          value: node.textContent ?? '',
        }));
        htmlHighlightFieldsRef.current = nextFields;
        setHtmlHighlightFields(nextFields);
      }
      const plan = computeEditableHighlightPackRuns(editableNodes);
      setHighlightPackPlan(plan);
      setPackRunSelections((prev) =>
        reconcilePackRunSelections(prev, plan.packRuns),
      );
      return;
    }

    htmlHighlightFieldsRef.current = [];
    setHtmlHighlightFields([]);
    setHighlightPackPlan({ packRuns: [], soloIds: [] });
    setPackRunSelections([]);
    pendingSidebarSyncedBodyRef.current = null;
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
    pendingSidebarSyncedBodyRef.current = null;
    setDraft(clause.bodyFormat === 'html' ? sanitizeClauseHtml(clause.body) : clause.body);
    const p =
      clause.bodyFormat === 'html'
        ? parsePackClauseSegments(clause.body)
        : null;
    setPackPickIndices(
      p ? Array.from({ length: p.packCount }, (_, i) => i) : [],
    );
    setEditing(true);
  };

  const commitEdit = () => {
    let raw =
      clause.bodyFormat === 'html'
        ? (richEditorRef.current?.innerHTML ?? draft)
        : draft;

    if (clause.bodyFormat === 'html' && htmlHighlightFieldsRef.current.length > 0) {
      if (richEditorRef.current) {
        raw = applySidebarHighlightValuesToRichEditorHtml(
          richEditorRef.current.innerHTML,
          htmlHighlightFieldsRef.current,
        );
      } else {
        const storeBody =
          useAppStore.getState().clauses[index]?.body ?? clause.body;
        raw = markYellowHighlightsEditable(
          applyPlainHighlightValuesToClauseHtml(
            storeBody,
            htmlHighlightFieldsRef.current.map((f) => f.value),
          ),
        );
      }
    }

    if (
      clause.bodyFormat === 'html' &&
      highlightPackPlanRef.current.packRuns.length > 0
    ) {
      raw = applyEditableHighlightPackRunsToHtml(
        raw,
        highlightPackPlanRef.current.packRuns,
        packRunSelectionsRef.current,
      );
    }

    let next =
      clause.bodyFormat === 'html'
        ? sanitizeClauseHtml(stripEditableHighlightMarkers(raw))
        : raw;

    if (clause.bodyFormat === 'html') {
      const appliedHighlightPacks =
        highlightPackPlanRef.current.packRuns.length > 0;
      if (!appliedHighlightPacks) {
        const parsed = parsePackClauseSegments(next);
        if (parsed && parsed.packCount > 0) {
          const filtered = packPickIndices.filter(
            (i) => i >= 0 && i < parsed.packCount,
          );
          next = rebuildHtmlWithPackSelection(parsed.segments, filtered);
        }
      }
    }

    updateClauseBody(index, next);
    recordClauseEdit(clause.title);
    setEditing(false);
    setPackPickIndices([]);
    setHighlightPackPlan({ packRuns: [], soloIds: [] });
    setPackRunSelections([]);
  };

  const finishEdit = (e: MouseEvent) => {
    e.stopPropagation();
    commitEdit();
  };

  useEffect(() => {
    const onForceFinish = () => {
      if (!editing || readOnly) return;
      commitEdit();
    };
    window.addEventListener('co-force-finish-edit', onForceFinish);
    return () => {
      window.removeEventListener('co-force-finish-edit', onForceFinish);
    };
  }, [editing, readOnly, clause.bodyFormat, draft, index, clause.title, packPickIndices]);

  const scrollToHighlightInEditor = (highlightId: string) => {
    requestAnimationFrame(() => {
      const root = richEditorRef.current;
      const scroller = leftPaneScrollRef.current;
      if (!root) return;
      const el = root.querySelector<HTMLElement>(
        `[data-highlight-id="${highlightId}"]`,
      );
      if (!el) return;
      if (scroller) {
        const sRect = scroller.getBoundingClientRect();
        const eRect = el.getBoundingClientRect();
        const delta =
          eRect.top -
          sRect.top -
          (scroller.clientHeight / 2 - eRect.height / 2);
        scroller.scrollTo({
          top: scroller.scrollTop + delta,
          behavior: 'smooth',
        });
      } else {
        el.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }
    });
  };

  const syncHtmlHighlightFields = (nextFields: Array<{ id: string; value: string }>) => {
    htmlHighlightFieldsRef.current = nextFields;
    setHtmlHighlightFields(nextFields);

    const root = richEditorRef.current;
    if (!root) {
      const baseBody =
        useAppStore.getState().clauses[index]?.body ?? clause.body;
      const nextBody = applyPlainHighlightValuesToClauseHtml(
        baseBody,
        nextFields.map((f) => f.value),
      );
      pendingSidebarSyncedBodyRef.current = nextBody;
      updateClauseBody(index, nextBody);
      scheduleClauseAudit();
      return;
    }

    for (const f of nextFields) {
      const el = root.querySelector<HTMLElement>(
        `[data-highlight-id="${f.id}"]`,
      );
      if (el) el.textContent = f.value;
    }

    const nextBody = stripEditableHighlightMarkers(
      sanitizeClauseHtml(
        applySidebarHighlightValuesToRichEditorHtml(
          root.innerHTML,
          nextFields,
        ),
      ),
    );
    pendingSidebarSyncedBodyRef.current = nextBody;
    updateClauseBody(index, nextBody);
    scheduleClauseAudit();
  };

  const togglePackRunSelection = (runIndex: number, fid: string) => {
    const runIds = highlightPackPlanRef.current.packRuns[runIndex] ?? [];
    const next = [...packRunSelectionsRef.current];
    while (next.length <= runIndex) next.push([]);
    const arr = [...(next[runIndex] ?? [])];
    const j = arr.indexOf(fid);
    if (j >= 0) next[runIndex] = arr.filter((x) => x !== fid);
    else next[runIndex] = [...arr, fid];
    packRunSelectionsRef.current = next;
    setPackRunSelections(next);

    const root = richEditorRef.current;
    if (root && highlightPackPlanRef.current.packRuns.length > 0) {
      const previewHtml = previewEditableHighlightPackRunsToHtml(
        root.innerHTML,
        highlightPackPlanRef.current.packRuns,
        next,
      );
      root.innerHTML = previewHtml;
      const domFields = Array.from(
        root.querySelectorAll<HTMLElement>('[data-highlight-id]'),
      )
        .map((el) => ({
          id: el.getAttribute('data-highlight-id') ?? '',
          value: el.textContent ?? '',
        }))
        .filter((f) => f.id.length > 0);
      if (domFields.length > 0) {
        syncHtmlHighlightFields(domFields);
        return;
      }
    }

    if (runIds.length === 0) return;
    const nextFields = applyPackRunRanksToFieldValues(
      htmlHighlightFieldsRef.current,
      runIds,
      next[runIndex] ?? [],
    );
    syncHtmlHighlightFields(nextFields);
  };

  const handleHtmlHighlightFieldChange = (id: string, nextValue: string) => {
    const prev = htmlHighlightFieldsRef.current;
    const nextFields = prev.map((f) =>
      f.id === id ? { ...f, value: nextValue } : f,
    );
    syncHtmlHighlightFields(nextFields);
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
              저장
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
                    ? 'grid items-stretch gap-x-2 gap-y-3 tablet:h-[calc(100vh-13.5rem)] tablet:min-h-[240px] tablet:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] tablet:overflow-hidden'
                    : ''
                }
              >
                <div
                  ref={leftPaneScrollRef}
                  className={
                    htmlHighlightFields.length > 0
                      ? 'h-full min-h-[200px] max-h-[min(70vh,520px)] overflow-y-auto overflow-x-hidden rounded-md border border-primary-300 bg-white ring-2 ring-primary-400/30 focus-within:ring-primary-500/50 tablet:max-h-none tablet:min-h-0'
                      : 'min-h-[160px] rounded-md border border-primary-300 bg-white ring-2 ring-primary-400/30 focus-within:ring-primary-500/50'
                  }
                >
                  <div
                    ref={richEditorRef}
                    suppressContentEditableWarning
                    className="clause-rich-body min-h-[160px] p-3 text-[13px] text-neutral-800 outline-none focus:ring-primary-500/50"
                    onInput={
                      htmlHighlightFields.length > 0
                        ? undefined
                        : handleHtmlRichEditorInput
                    }
                  />
                </div>
                {htmlHighlightFields.length > 0 ? (
                  <div className="flex h-full min-h-[200px] w-full max-h-[min(70vh,520px)] flex-col overflow-hidden rounded-md border border-warning-300 bg-warning-50 py-2.5 pl-0 pr-2.5 tablet:max-h-none tablet:min-h-0">
                    <p className="mb-2 shrink-0 pl-0 pr-2 text-[11px] font-semibold text-warning-800">
                      노란색 하이라이트 수정 컬럼
                    </p>
                    <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain pr-1 pl-0 [scrollbar-gutter:stable]">
                      {buildHighlightSidebarRows(
                        htmlHighlightFields.map((f) => f.id),
                        highlightPackPlan.packRuns,
                        highlightPackPlan.soloIds,
                      ).map((row) => {
                        if (row.type === 'solo') {
                          const field = htmlHighlightFields.find(
                            (f) => f.id === row.id,
                          );
                          if (!field) return null;
                          const gi =
                            htmlHighlightFields.findIndex(
                              (f) => f.id === row.id,
                            ) + 1;
                          return (
                            <div key={field.id} className="mb-2.5 pr-1">
                              <button
                                type="button"
                                className="mb-1 block w-full rounded px-0.5 text-left text-[11px] font-medium text-neutral-600 hover:bg-warning-100/80 hover:text-primary-800"
                                onClick={() =>
                                  scrollToHighlightInEditor(field.id)
                                }
                              >
                                항목 {gi}
                              </button>
                              <input
                                type="text"
                                value={field.value}
                                spellCheck={false}
                                onChange={(ev) =>
                                  handleHtmlHighlightFieldChange(
                                    field.id,
                                    ev.target.value,
                                  )
                                }
                                onFocus={() =>
                                  scrollToHighlightInEditor(field.id)
                                }
                                className="w-full cursor-text rounded-md border border-warning-300 bg-white px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                              />
                            </div>
                          );
                        }
                        const runIds =
                          highlightPackPlan.packRuns[row.runIndex] ?? [];
                        const order =
                          packRunSelections[row.runIndex] ?? runIds;
                        const orderedVisible = [
                          ...order.filter((fid) => runIds.includes(fid)),
                          ...runIds.filter((fid) => !order.includes(fid)),
                        ];
                        return (
                          <div
                            key={`pack-run-${row.runIndex}`}
                            className="mb-3 rounded-md border-2 border-warning-400 bg-white/80 py-2.5 pl-0 pr-2.5"
                          >
                            <p className="mb-2 text-[11px] font-semibold text-warning-900">
                              번호 붙은 정의 줄 ({runIds.length}개, 예: 1. 2. …) —
                              체크한 것만 본문에 남고, 체크한 순서로 1·2·3… 이 붙습니다.
                            </p>
                            <div className="space-y-2">
                              {orderedVisible.map((fid) => {
                                const field = htmlHighlightFields.find(
                                  (f) => f.id === fid,
                                );
                                if (!field) return null;
                                const checked = order.includes(fid);
                                const rank = checked
                                  ? order.indexOf(fid) + 1
                                  : 0;
                                const packGi =
                                  htmlHighlightFields.findIndex(
                                    (f) => f.id === fid,
                                  ) + 1;
                                return (
                                  <div
                                    key={fid}
                                    className="flex flex-wrap items-start gap-2 text-[11px] text-neutral-700"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      aria-label={`항목 ${packGi} 본문에 포함`}
                                      onChange={() =>
                                        togglePackRunSelection(
                                          row.runIndex,
                                          fid,
                                        )
                                      }
                                      onFocus={() =>
                                        scrollToHighlightInEditor(fid)
                                      }
                                      className="mt-1 h-3.5 w-3.5 shrink-0 rounded border-warning-400 text-primary-700"
                                    />
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1">
                                        {rank > 0 ? (
                                          <span className="inline-block rounded bg-warning-100 px-1 py-px text-[10px] font-semibold text-warning-800">
                                            순서 {rank}
                                          </span>
                                        ) : null}
                                        <button
                                          type="button"
                                          className="rounded px-1 py-px text-[10px] font-medium text-primary-700 hover:bg-warning-100/80"
                                          onClick={() =>
                                            scrollToHighlightInEditor(fid)
                                          }
                                        >
                                          원본 위치
                                        </button>
                                      </div>
                                      <input
                                        type="text"
                                        value={field.value}
                                        spellCheck={false}
                                        onChange={(ev) =>
                                          handleHtmlHighlightFieldChange(
                                            fid,
                                            ev.target.value,
                                          )
                                        }
                                        onFocus={() =>
                                          scrollToHighlightInEditor(fid)
                                        }
                                        className="mt-1 w-full cursor-text rounded-md border border-warning-300 bg-white px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-400/30"
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
              <p className="mt-2 text-[11px] text-neutral-500">
                노란색 표시가 있으면 오른쪽 컬럼에서만 수정됩니다. (없으면 전체 편집)
              </p>
              {hasPackClauseSegments(clause.body) &&
              !(
                htmlHighlightFields.length > 0 &&
                highlightPackPlan.packRuns.length > 0
              ) ? (
                <div className="mt-3 border-t border-primary-200/80 pt-3">
                  <p className="mb-2 text-[11px] font-medium text-neutral-600">
                    노란 박스 번호 항목: 체크한 것만 계약서 본문에 남습니다. 체크한
                    순서대로 1·2·3… 번호가 다시 붙습니다. 완료 시 위 편집 내용과
                    함께 반영됩니다.
                  </p>
                  {(() => {
                    const p = parsePackClauseSegments(clause.body);
                    if (!p) return null;
                    return (
                      <ClausePackCheckboxEditor
                        segments={p.segments}
                        orderedPackIndices={packPickIndices}
                        onChangeOrder={setPackPickIndices}
                      />
                    );
                  })()}
                </div>
              ) : null}
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
