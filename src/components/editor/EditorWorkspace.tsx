import { useState, useMemo, useCallback } from 'react';
import { PickManagedTemplateModal } from '../contracts/PickManagedTemplateModal';
import {
  detectToxicClauses,
  severityLabel,
  severityColor,
  type ToxicClauseIssue,
} from '../../lib/toxicClauseDetector';
import {
  canPerformContractReviewByDepartment,
  defaultReviewForVer,
} from '../../lib/versionReviewPolicy';
import { isAdminOrManagementSupport } from '../../lib/userManagementPolicy';
import { useAppStore } from '../../store/useAppStore';
import { useTemplateListStore } from '../../store/useTemplateListStore';
import { ClauseBlock } from './ClauseBlock';
import { patchDraft } from '../../lib/contractDraftDb';
import {
  persistCurrentDraft,
  buildCurrentDraftWordBlob,
} from '../../lib/persistContractDraft';
import { sendReviewRequestNotify } from '../../lib/notifyReviewRequest';
import { uploadPreviewBlob, deletePreviewBlob } from '../../lib/previewStorage';

function VersionTimeline() {
  const displayVer = useAppStore((s) => s.displayVer);
  const saveGeneration = useAppStore((s) => s.saveGeneration);
  const versionReviewByVer = useAppStore((s) => s.versionReviewByVer);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  const setVersionReviewApproval = useAppStore(
    (s) => s.setVersionReviewApproval,
  );
  const canReview = canPerformContractReviewByDepartment(
    currentUserDepartment,
  );

  const verNum = parseFloat(displayVer.replace(/[^0-9.]/g, '')) || 0;
  const cap = Math.min(saveGeneration - 1, 3);
  const items: { ver: string; current: boolean; meta: string; desc: string }[] =
    [];
  for (let i = 0; i <= cap; i++) {
    const v =
      'v' + (verNum - (saveGeneration - 1 - i) * 0.1).toFixed(1);
    const isCur = i === cap;
    items.push({
      ver: v,
      current: isCur,
      meta: isCur ? '이주헌 · 방금' : `이주헌 · ${saveGeneration - 1 - i}분 전`,
      desc: isCur ? '최근 저장' : '이전 버전',
    });
  }

  function reviewBadge(st: ReturnType<typeof defaultReviewForVer>) {
    switch (st) {
      case 'approved':
        return (
          <span className="inline-flex items-center rounded border border-success-300 bg-success-50 px-1.5 py-px text-[10px] font-semibold text-success-800">
            승인됨
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center rounded border border-danger-300 bg-danger-50 px-1.5 py-px text-[10px] font-semibold text-danger-800">
            반려
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded border border-warning-300 bg-warning-50 px-1.5 py-px text-[10px] font-semibold text-warning-800">
            검토 대기
          </span>
        );
    }
  }

  return (
    <div className="py-2">
      <div className="mb-1 flex items-center gap-2 border-b border-neutral-100 px-5 pb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        <span className="min-w-0 flex-1">버전</span>
        <span className="w-[120px] shrink-0 text-right">검토·승인</span>
      </div>
      {items.map((it, idx) => {
        const st = defaultReviewForVer(versionReviewByVer, it.ver);
        const showActions = canReview && st === 'pending';

        return (
          <div
            key={`${it.ver}-${idx}`}
            className={`flex gap-2 px-3 py-2.5 transition-colors sm:px-5 ${
              it.current ? 'bg-primary-50' : 'hover:bg-neutral-50'
            }`}
          >
            <div className="flex flex-col items-center pt-1">
              <div
                className={`h-2.5 w-2.5 shrink-0 rounded-full border-2 bg-white ${
                  it.current
                    ? 'border-primary-700 bg-primary-700'
                    : 'border-neutral-300'
                }`}
              />
              {idx < items.length - 1 ? (
                <div className="my-0.5 min-h-5 w-0.5 flex-1 bg-neutral-200" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span
                  className={`font-mono text-xs font-bold ${
                    it.current ? 'text-primary-800' : 'text-neutral-900'
                  }`}
                >
                  {it.ver}
                </span>
                {it.current ? (
                  <span className="rounded bg-primary-100 px-1.5 py-px text-[10px] font-semibold text-primary-800">
                    현재
                  </span>
                ) : null}
              </div>
              <div className="my-0.5 text-[11px] text-neutral-400">{it.meta}</div>
              <div className="text-[11px] text-neutral-500">{it.desc}</div>
            </div>
            <div className="flex w-[120px] shrink-0 flex-col items-end gap-1.5 pt-0.5">
              {reviewBadge(st)}
              {showActions ? (
                <div className="flex w-full flex-col gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      setVersionReviewApproval(it.ver, 'approved')
                    }
                    className="w-full rounded border border-success-600 bg-white px-1.5 py-1 text-[10px] font-medium text-success-800 hover:bg-success-50"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setVersionReviewApproval(it.ver, 'rejected')
                    }
                    className="w-full rounded border border-danger-300 bg-white px-1.5 py-1 text-[10px] font-medium text-danger-800 hover:bg-danger-50"
                  >
                    반려
                  </button>
                </div>
              ) : null}
              {!canReview && st === 'pending' ? (
                <span className="max-w-[118px] text-right text-[10px] text-neutral-400">
                  경영지원팀 승인 대기
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function EditorWorkspace() {
  const [tplDraftOpen, setTplDraftOpen] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [finalizeBusy, setFinalizeBusy] = useState(false);
  const [wordBusy] = useState(false);
  const [reviewDecisionBusy, setReviewDecisionBusy] = useState(false);
  const [reviewUndoBusy, setReviewUndoBusy] = useState(false);
  const [toxicScanDone, setToxicScanDone] = useState(false);
  const [toxicIssues, setToxicIssues] = useState<ToxicClauseIssue[]>([]);
  const [dismissedToxic, setDismissedToxic] = useState<Set<string>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewIframeUrl, setPreviewIframeUrl] = useState<string | null>(null);
  const [previewStoragePath, setPreviewStoragePath] = useState<string | null>(null);
  const templateListItems = useTemplateListStore((s) => s.items);
  const editorMode = useAppStore((s) => s.editorMode);
  const closeReviewDraft = useAppStore((s) => s.closeReviewDraft);
  const selection = useAppStore((s) => s.selection);
  const editorOrigin = useAppStore((s) => s.editorOrigin);
  const managedChipLabel = useAppStore((s) => s.managedChipLabel);
  const matrixClauseSourceName = useAppStore((s) => s.matrixClauseSourceName);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const contractDocumentTitle = useAppStore((s) => s.contractDocumentTitle);
  const clauses = useAppStore((s) => s.clauses);
  const displayVer = useAppStore((s) => s.displayVer);
  const aiPanelVisible = useAppStore((s) => s.aiPanelVisible);
  const backToSelect = useAppStore((s) => s.backToSelect);

  const showToast = useAppStore((s) => s.showToast);
  const hideAiPanel = useAppStore((s) => s.hideAiPanel);
  const acceptAiSuggestion = useAppStore((s) => s.acceptAiSuggestion);
  const rejectAiSuggestion = useAppStore((s) => s.rejectAiSuggestion);
  const loadDraftFromManagedTemplate = useAppStore(
    (s) => s.loadDraftFromManagedTemplate,
  );
  const tab = useAppStore((s) => s.editorBottomTab);
  const setTab = useAppStore((s) => s.setEditorBottomTab);
  const setPage = useAppStore((s) => s.setPage);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  const appendAudit = useAppStore((s) => s.appendAudit);
  const reviewApprovedReadOnly = useAppStore((s) => s.reviewApprovedReadOnly);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);

  const visibleToxicIssues = useMemo(
    () => toxicIssues.filter((t) => !dismissedToxic.has(`${t.clauseIndex}-${t.category}`)),
    [toxicIssues, dismissedToxic],
  );

  if (!activeTemplate) return null;

  const isReview = editorMode === 'review';
  const isReviewExportOnly = isReview && reviewApprovedReadOnly;

  const runToxicScan = () => {
    const found = detectToxicClauses(clauses);
    setToxicIssues(found);
    setToxicScanDone(true);
    setDismissedToxic(new Set());
  };

  const openPreview = useCallback(async () => {
    setPreviewBusy(true);
    try {
      window.dispatchEvent(new Event('co-force-finish-edit'));
      await new Promise<void>((r) => queueMicrotask(r));
      const blob = await buildCurrentDraftWordBlob();

      try {
        const { publicUrl, path } = await uploadPreviewBlob(blob);
        const bust = `co=${Date.now()}`;
        const srcWithBust = `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}${bust}`;
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(srcWithBust)}`;
        setPreviewStoragePath(path);
        setPreviewIframeUrl(officeUrl);
        setPreviewOpen(true);
      } catch {
        showToast('Office Online 미리보기를 사용할 수 없어 Word 파일을 다운로드합니다', 'info');
        const { downloadBlob } = await import('../../lib/exportContractDocx');
        const s = useAppStore.getState();
        const base =
          (s.contractDocumentTitle.trim() || activeTemplate.label || 'contract')
            .replace(/[<>:"/\\|?*]/g, '_')
            .slice(0, 120) || 'contract';
        downloadBlob(blob, `${base}-미리보기.docx`);
      }
    } catch (e) {
      console.error(e);
      showToast('미리보기 생성에 실패했습니다', 'warning');
    } finally {
      setPreviewBusy(false);
    }
  }, [showToast, activeTemplate]);

  const closePreview = useCallback(async () => {
    setPreviewOpen(false);
    setPreviewIframeUrl(null);
    if (previewStoragePath) {
      deletePreviewBlob(previewStoragePath).catch(console.error);
      setPreviewStoragePath(null);
    }
  }, [previewStoragePath]);

  const dismissToxicIssue = (issue: ToxicClauseIssue) => {
    setDismissedToxic((prev) => {
      const next = new Set(prev);
      next.add(`${issue.clauseIndex}-${issue.category}`);
      return next;
    });
  };
  const canSave = isAdminOrManagementSupport({
    employeeId: authEmployeeId,
    department: currentUserDepartment,
  });

  const saveReviewDraft = async () => {
    setSaveBusy(true);
    try {
      await persistCurrentDraft();
      appendAudit('검토 편집 저장', 'save');
      showToast('검토 편집 내용을 저장했습니다', 'success');
    } catch (e) {
      console.error(e);
      showToast('검토 저장에 실패했습니다', 'warning');
    } finally {
      setSaveBusy(false);
    }
  };

  const decideReviewStatus = async (status: 'approved' | 'rejected') => {
    const message =
      status === 'approved'
        ? '이 계약을 승인 처리할까요?'
        : '이 계약을 반려 처리할까요?';
    if (!window.confirm(message)) return;
    setReviewDecisionBusy(true);
    try {
      await persistCurrentDraft();
      const id = useAppStore.getState().localDraftId;
      if (!id) {
        showToast('검토 대상 초안을 찾을 수 없습니다', 'warning');
        return;
      }
      const ok = await patchDraft(id, {
        reviewStatus: status,
        updatedAt: new Date().toISOString(),
      });
      if (!ok) {
        showToast('검토 상태 저장에 실패했습니다', 'warning');
        return;
      }
      appendAudit(status === 'approved' ? '검토 승인' : '검토 반려', status === 'approved' ? 'review_complete' : 'review_reject');
      showToast(status === 'approved' ? '승인 처리되었습니다' : '반려 처리되었습니다', status === 'approved' ? 'success' : 'warning');
      if (status === 'approved') {
        useAppStore.setState({
          reviewApprovedReadOnly: true,
          aiPanelVisible: false,
        });
      } else {
        closeReviewDraft();
      }
    } catch (e) {
      console.error(e);
      showToast('검토 상태 저장에 실패했습니다', 'warning');
    } finally {
      setReviewDecisionBusy(false);
    }
  };

  const revertApprovedReview = async () => {
    if (
      !window.confirm(
        '승인을 취소하고 검토 중 상태로 되돌릴까요? 목록에는 검토 중으로 표시됩니다.',
      )
    ) {
      return;
    }
    setReviewUndoBusy(true);
    try {
      await persistCurrentDraft();
      const id = useAppStore.getState().localDraftId;
      if (!id) {
        showToast('검토 대상 초안을 찾을 수 없습니다', 'warning');
        return;
      }
      const ok = await patchDraft(id, {
        reviewStatus: 'in_review',
        updatedAt: new Date().toISOString(),
      });
      if (!ok) {
        showToast('상태 저장에 실패했습니다', 'warning');
        return;
      }
      useAppStore.setState({
        reviewApprovedReadOnly: false,
        aiPanelVisible: true,
        editorBottomTab: 'ai',
      });
      appendAudit('승인 취소 · 검토 중으로 복귀', 'save');
      showToast('검토 중 상태로 되돌렸습니다', 'success');
    } catch (e) {
      console.error(e);
      showToast('승인 취소 처리에 실패했습니다', 'warning');
    } finally {
      setReviewUndoBusy(false);
    }
  };

  const baseMatrixChip = `${selection.genre ?? '—'} / ${selection.type ?? '—'} / ${selection.doc ?? '—'}`;
  const tmplChip =
    editorOrigin === 'managed' && managedChipLabel
      ? managedChipLabel
      : matrixClauseSourceName
        ? `${baseMatrixChip} · 조항:「${matrixClauseSourceName}」(템플릿 관리)`
        : baseMatrixChip;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {!isReview ? (
        <PickManagedTemplateModal
          open={tplDraftOpen}
          onClose={() => setTplDraftOpen(false)}
          items={templateListItems}
          selectedId={null}
          title="템플릿에서 조항 초안 불러오기"
          subtitle="템플릿 관리에 등록된 활성 항목의 조항으로 현재 초안을 교체합니다."
          onSelect={(id) => {
            const it =
              useTemplateListStore.getState().items.find(
                (i) => i.id === id && i.status === 'active',
              ) ?? null;
            if (it) loadDraftFromManagedTemplate(it);
          }}
        />
      ) : null}
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          {isReview ? (
            <button
              type="button"
              onClick={closeReviewDraft}
              className="cursor-pointer text-primary-700 hover:underline"
            >
              계약서 검토
            </button>
          ) : (
            <button
              type="button"
              onClick={backToSelect}
              className="cursor-pointer text-primary-700 hover:underline"
            >
              작성
            </button>
          )}
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">{activeTemplate.label}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2 pb-4">
          <div className="min-w-0">
            {contractDocumentTitle.trim() ? (
              <div className="mb-0.5 truncate text-[13px] font-semibold text-primary-800">
                {contractDocumentTitle.trim()}
              </div>
            ) : null}
            <h1 className="max-w-[320px] truncate text-[15px] font-bold text-neutral-900">
              {activeTemplate.label}
            </h1>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-600">
            <span className="h-[5px] w-[5px] rounded-full bg-neutral-400" />
            {isReviewExportOnly
              ? '승인 완료 · 열람'
              : isReview
                ? '검토 열람'
                : '초안'}
          </span>
          {isReview && !isReviewExportOnly ? (
            <span className="rounded-full border border-info-300 bg-info-50 px-2 py-0.5 text-[10px] font-semibold text-info-800">
              AI 검토·제안
            </span>
          ) : null}
          <span className="rounded bg-neutral-100 px-1.5 py-px font-mono text-[11px] text-neutral-500">
            {displayVer}
          </span>
          {isReview ? (
            <span className="inline-flex max-w-[min(100%,420px)] items-center gap-1.5 truncate rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] text-neutral-700">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="shrink-0"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              <span className="truncate">{tmplChip}</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={backToSelect}
              className="inline-flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-[11px] text-primary-800 hover:bg-primary-100"
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18M9 21V9" />
              </svg>
              {tmplChip}
              <svg
                width="9"
                height="9"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <div className="ml-auto flex shrink-0 flex-wrap gap-2">
            {!isReview ? (
              <>
                <button
                  type="button"
                  onClick={() => setTplDraftOpen(true)}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  템플릿에서 초안
                </button>
                <button
                  type="button"
                  onClick={backToSelect}
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                >
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden
                  >
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                  템플릿 변경
                </button>
              </>
            ) : null}
            {isReview && !isReviewExportOnly && canSave ? (
              <>
                <button
                  type="button"
                  disabled={saveBusy || reviewDecisionBusy}
                  onClick={() => void saveReviewDraft()}
                  className="inline-flex items-center gap-1 rounded-md border border-primary-300 bg-primary-50 px-2.5 py-1.5 text-xs font-medium text-primary-800 hover:bg-primary-100 disabled:opacity-50"
                >
                  {saveBusy ? '검토 저장…' : '검토 저장'}
                </button>
                <button
                  type="button"
                  disabled={saveBusy || reviewDecisionBusy}
                  onClick={() => void decideReviewStatus('approved')}
                  className="inline-flex items-center gap-1 rounded-md border border-success-600 bg-success-50 px-2.5 py-1.5 text-xs font-medium text-success-800 hover:bg-success-100 disabled:opacity-50"
                >
                  {reviewDecisionBusy ? '처리 중…' : '승인'}
                </button>
                <button
                  type="button"
                  disabled={saveBusy || reviewDecisionBusy}
                  onClick={() => void decideReviewStatus('rejected')}
                  className="inline-flex items-center gap-1 rounded-md border border-danger-500 bg-danger-50 px-2.5 py-1.5 text-xs font-medium text-danger-800 hover:bg-danger-100 disabled:opacity-50"
                >
                  {reviewDecisionBusy ? '처리 중…' : '반려'}
                </button>
              </>
            ) : null}
            {isReviewExportOnly && canSave ? (
              <button
                type="button"
                disabled={reviewUndoBusy || wordBusy}
                onClick={() => void revertApprovedReview()}
                title="다시 눌러 승인을 취소하고 검토 중으로 되돌립니다"
                className="inline-flex items-center gap-1 rounded-md border border-success-600 bg-success-100 px-2.5 py-1.5 text-xs font-semibold text-success-900 hover:bg-success-200 disabled:opacity-60"
              >
                {reviewUndoBusy ? '처리 중…' : '승인완료'}
              </button>
            ) : null}
            {!isReview ? (
              <button
                type="button"
                disabled={finalizeBusy || saveBusy || previewBusy}
                onClick={() => void openPreview()}
                className="inline-flex items-center gap-1 rounded-md border border-amber-500 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-950 hover:bg-amber-100 disabled:opacity-50"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                {previewBusy ? '미리보기 생성 중…' : '확정'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div
        className={`grid min-h-0 flex-1 grid-cols-1 overflow-hidden ${isReviewExportOnly ? '' : 'lg:grid-cols-[1fr_360px]'}`}
      >
        <div className="min-h-0 overflow-y-auto p-5">
          {isReviewExportOnly ? (
            <p className="mb-4 rounded-md border border-success-200 bg-success-50 px-3 py-2 text-[12px] text-success-900">
              이 계약은 승인이 완료되었습니다. 내용은 읽기 전용이며 Word 보내기만
              할 수 있습니다. 상단 「승인완료」를 다시 누르면 검토 중으로 되돌릴 수
              있습니다.
            </p>
          ) : null}
          {clauses.map((c, i) => (
            <ClauseBlock
              key={`${c.num}-${i}`}
              clause={c}
              index={i}
              readOnly={isReviewExportOnly}
            />
          ))}
        </div>
        {isReviewExportOnly ? null : (
        <div className="min-h-0 border-l border-neutral-200 bg-white">
          {isReview ? (
            <>
              <div className="flex border-b border-neutral-200">
                {(
                  [
                    ['ai', 'AI 검토·제안'],
                    ['ver', '버전 이력'],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={`flex-1 px-2 py-2.5 text-center text-xs font-medium transition-colors ${
                      tab === id
                        ? 'border-b-2 border-primary-800 font-semibold text-primary-800'
                        : 'border-b-2 border-transparent text-neutral-500 hover:text-neutral-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="min-h-0 overflow-y-auto p-4">
                {tab === 'ai' ? (
                  <>
                    {/* 독소조항 탐지 */}
                    {!toxicScanDone ? (
                      <div className="mb-4 text-center">
                        <div className="mb-3 rounded-xl border border-neutral-200 bg-gradient-to-b from-neutral-50 to-white px-4 py-5">
                          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 9v4" />
                              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                              <circle cx="12" cy="16" r="0.5" fill="#EF4444" />
                            </svg>
                          </div>
                          <h3 className="mb-1 text-[13px] font-bold text-neutral-900">독소조항 탐지</h3>
                          <p className="mb-3 text-[11px] leading-relaxed text-neutral-500">
                            일방적 해지권, 과도한 위약금, 면책 범위 과다 등<br />
                            불공정 조항을 자동으로 검출합니다.
                          </p>
                          <button
                            type="button"
                            onClick={runToxicScan}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-700 active:scale-[0.97] transition-all"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="11" cy="11" r="8" />
                              <path d="M21 21l-4.35-4.35" />
                            </svg>
                            조항 분석 시작
                          </button>
                        </div>

                        {aiPanelVisible ? (
                          <div className="mb-4 overflow-hidden rounded-[10px] border-[1.5px] border-info-300 bg-info-100">
                            <div className="flex items-center gap-2 border-b border-info-300 px-4 py-3">
                              <span className="rounded border border-info-300 bg-info-100 px-1.5 py-0.5 text-[11px] font-bold text-info-700">AI 검토</span>
                              <span className="text-[13px] font-semibold text-neutral-900">{activeTemplate.aiSuggest.title}</span>
                              <button type="button" className="ml-auto flex h-[22px] w-[22px] items-center justify-center rounded text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700" onClick={() => { hideAiPanel(); setTab('ver'); }} aria-label="닫기">✕</button>
                            </div>
                            <div className="px-4 py-3.5">
                              <div className="mb-2.5 rounded-md border border-info-300 bg-white px-2.5 py-1.5 text-[11px] text-info-700">{activeTemplate.aiSuggest.reason}</div>
                              <p className="mb-3 max-h-20 overflow-hidden text-xs leading-relaxed text-neutral-700">{activeTemplate.aiSuggest.body}</p>
                              <div className="mb-3 flex gap-1.5 rounded-md border border-warning-300 bg-warning-100 px-2.5 py-2 text-[11px] text-warning-700">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>
                                AI 추천은 법적 조언이 아닙니다. 반드시 법무 검토 필요.
                              </div>
                              <div className="flex gap-2">
                                <button type="button" onClick={acceptAiSuggestion} className="flex-1 rounded-md bg-primary-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700">수락하여 삽입</button>
                                <button type="button" onClick={rejectAiSuggestion} className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100">거부</button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* 스캔 결과 헤더 */}
                        <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white ${visibleToxicIssues.length > 0 ? 'bg-red-500' : 'bg-emerald-500'}`}>
                              {visibleToxicIssues.length}
                            </span>
                            <span className="text-[12px] font-semibold text-neutral-800">
                              {visibleToxicIssues.length > 0
                                ? `${visibleToxicIssues.length}건 탐지됨`
                                : '독소조항 없음'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={runToxicScan}
                            className="rounded-md border border-neutral-200 px-2 py-1 text-[11px] font-medium text-neutral-500 hover:bg-neutral-50"
                          >
                            재검사
                          </button>
                        </div>

                        {visibleToxicIssues.length === 0 && toxicScanDone ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center">
                            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                <polyline points="22 4 12 14.01 9 11.01" />
                              </svg>
                            </div>
                            <p className="text-[12px] font-semibold text-emerald-800">불공정 조항이 발견되지 않았습니다</p>
                            <p className="mt-1 text-[11px] text-emerald-600">법무 최종 검토를 진행해 주세요.</p>
                          </div>
                        ) : null}

                        {/* 이슈 목록 */}
                        {visibleToxicIssues.map((issue, i) => {
                          const sc = severityColor(issue.severity);
                          return (
                            <div key={`${issue.clauseIndex}-${issue.category}-${i}`} className={`overflow-hidden rounded-xl border ${sc.border}`}>
                              <div className={`flex items-start gap-2 ${sc.bg} px-3 py-2.5`}>
                                <span className={`mt-0.5 shrink-0 ${sc.icon}`}>
                                  {issue.severity === 'critical' ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" /></svg>
                                  ) : issue.severity === 'warning' ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><path d="M12 9v4" /></svg>
                                  ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><circle cx="12" cy="8" r="0.5" fill="currentColor" /></svg>
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${sc.bg} ${sc.text} border ${sc.border}`}>
                                      {severityLabel(issue.severity)}
                                    </span>
                                    <span className="text-[11px] font-bold text-neutral-800">{issue.category}</span>
                                  </div>
                                  <p className="mt-0.5 text-[10px] text-neutral-500">
                                    {issue.clauseTitle} · 매칭: <span className="font-medium text-neutral-700">"{issue.matched}"</span>
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => dismissToxicIssue(issue)}
                                  className="shrink-0 rounded p-0.5 text-neutral-400 hover:bg-white/60 hover:text-neutral-600"
                                  title="무시"
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                </button>
                              </div>
                              <div className="border-t border-neutral-100 bg-white px-3 py-2.5">
                                <p className="mb-1.5 text-[11px] leading-relaxed text-neutral-600">
                                  {issue.description}
                                </p>
                                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-2">
                                  <div className="mb-1 flex items-center gap-1">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                                    <span className="text-[10px] font-bold text-emerald-700">수정 제안</span>
                                  </div>
                                  <p className="text-[11px] leading-relaxed text-emerald-800">
                                    {issue.suggestion}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        <div className="mt-2 flex gap-1.5 rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[10px] text-neutral-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden>
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                          </svg>
                          본 탐지 결과는 법적 조언이 아닙니다. 반드시 법무 전문가의 검토가 필요합니다.
                        </div>
                      </div>
                    )}
                  </>
                ) : null}
                {tab === 'ver' ? <VersionTimeline /> : null}
              </div>
            </>
          ) : (
            <div className="h-full min-h-0 overflow-y-auto p-4">
              {/* 감사 로그 UI는 숨김 처리 */}
            </div>
          )}
        </div>
        )}
      </div>

      {previewOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-6 py-4">
              <h2 className="text-sm font-bold text-neutral-900">
                Word 미리보기
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={finalizeBusy}
                  onClick={async () => {
                    setFinalizeBusy(true);
                    try {
                      await persistCurrentDraft();
                      const id = useAppStore.getState().localDraftId;
                      if (id) {
                        await patchDraft(id, { reviewStatus: 'in_review' });
                      }
                      appendAudit('검토 요청(확정)', 'save');
                      const notifyResult = await sendReviewRequestNotify({
                        contractDocumentTitle,
                        templateLabel: activeTemplate.label,
                        submittedByEmployeeId: authEmployeeId,
                      });
                      if (notifyResult.ok && !notifyResult.skipped) {
                        appendAudit('검토 요청 알림 메일 발송', 'export');
                      }
                      closePreview();
                      if (
                        canPerformContractReviewByDepartment(
                          currentUserDepartment,
                        )
                      ) {
                        setPage('review');
                      } else {
                        setPage('contracts');
                      }
                      if (notifyResult.ok) {
                        showToast(
                          notifyResult.skipped
                            ? '검토 단계로 전달되었습니다'
                            : '검토 단계로 전달되었습니다. 경영지원팀에 알림 메일을 보냈습니다.',
                          'success',
                        );
                      } else {
                        showToast(
                          `검토 단계로 전달되었습니다. 알림 메일 발송 실패: ${notifyResult.error}`,
                          'warning',
                        );
                      }
                    } catch (e) {
                      console.error(e);
                      showToast('확정 처리에 실패했습니다', 'warning');
                    } finally {
                      setFinalizeBusy(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:opacity-50"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                  {finalizeBusy ? '확정 처리 중…' : '확정하기'}
                </button>
                <button
                  type="button"
                  onClick={closePreview}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-4 py-2 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="relative min-h-0 flex-1 bg-neutral-100">
              {previewIframeUrl ? (
                <iframe
                  key={previewIframeUrl}
                  src={previewIframeUrl}
                  title="Word 미리보기"
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-neutral-300 border-t-primary-600" />
                    <span className="text-sm text-neutral-500">문서 업로드 중…</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
