import { useCallback, useEffect, useMemo, useState } from 'react';
import { listDrafts, patchDraft } from '../lib/contractDraftDb';
import type {
  ContractReviewStatus,
  StoredContractDraft,
} from '../lib/contractDraftTypes';
import { isDraftReviewApproved } from '../lib/contractListFilter';
import { exportStoredDraftAsWordFile } from '../lib/persistContractDraft';
import { summarizeDraftBodyPreview } from '../lib/contractDraftSummary';
import { canPerformContractReviewByDepartment } from '../lib/versionReviewPolicy';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from '../lib/userDepartments';
import { EditorWorkspace } from '../components/editor/EditorWorkspace';
import { useAppStore } from '../store/useAppStore';

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function draftDisplayName(d: StoredContractDraft): string {
  const t = d.contractDocumentTitle.trim();
  if (t) return t;
  return d.templateLabel.trim() || '제목 없음';
}

const REVIEW_OPTIONS: { value: ContractReviewStatus; label: string }[] = [
  { value: 'pending', label: '대기' },
  { value: 'in_review', label: '검토중' },
  { value: 'approved', label: '승인' },
  { value: 'rejected', label: '반려' },
];

function byUpdatedDesc(a: StoredContractDraft, b: StoredContractDraft): number {
  return (
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function ReviewPage() {
  const [wordExportingId, setWordExportingId] = useState<string | null>(null);
  const openReviewDraft = useAppStore((s) => s.openReviewDraft);
  const editorMode = useAppStore((s) => s.editorMode);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const showToast = useAppStore((s) => s.showToast);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  const setPage = useAppStore((s) => s.setPage);

  const canReview = canPerformContractReviewByDepartment(
    currentUserDepartment,
  );

  const [drafts, setDrafts] = useState<StoredContractDraft[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDrafts();
      list.sort(byUpdatedDesc);
      setDrafts(list);
    } finally {
      setLoading(false);
    }
  }, []);

  /** 검토 중 + 승인 완료 건을 검토 목록에서 함께 관리 */
  const reviewQueue = useMemo(
    () =>
      drafts.filter(
        (d) =>
          !d.archived &&
          ((d.reviewStatus ?? 'pending') === 'in_review' ||
            (d.reviewStatus ?? 'pending') === 'approved'),
      ),
    [drafts],
  );

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  useEffect(() => {
    if (editorMode !== 'review') {
      void refreshDrafts();
    }
  }, [editorMode, refreshDrafts]);

  useEffect(() => {
    if (!canPerformContractReviewByDepartment(currentUserDepartment)) {
      setPage('dashboard');
      showToast(
        `계약서 검토 화면은 ${MANAGEMENT_SUPPORT_DEPARTMENT} 소속만 이용할 수 있습니다`,
        'warning',
      );
    }
  }, [currentUserDepartment, setPage, showToast]);

  if (!canReview) {
    return null;
  }

  if (editorMode === 'review' && activeTemplate) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <EditorWorkspace />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>홈</span>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">계약서 검토</span>
        </div>
        <div className="pb-4">
          <h1 className="text-xl font-bold text-neutral-900">계약서 검토</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            검토 요청(in_review)과 승인 완료(approved) 계약을 함께 표시합니다.
            검토·승인 상태를 여기서 관리합니다. ({MANAGEMENT_SUPPORT_DEPARTMENT}{' '}
            전용)
          </p>
        </div>
      </div>
      <div className="flex-1 px-7 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void refreshDrafts()}
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50"
          >
            목록 새로고침
          </button>
        </div>
        <div className="overflow-x-auto rounded-[10px] border border-neutral-200 bg-white">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr>
                {[
                  '계약서명',
                  '유형',
                  '버전',
                  '수정일',
                  '저장 요약',
                  '검토/승인',
                  '액션',
                ].map((h) => (
                  <th
                    key={h}
                    className={`border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400 ${
                      h === '저장 요약' ? '' : 'whitespace-nowrap'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-b border-neutral-100 px-4 py-12 text-center text-[13px] text-neutral-500"
                  >
                    저장된 초안을 불러오는 중…
                  </td>
                </tr>
              ) : reviewQueue.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="border-b border-neutral-100 px-4 py-12 text-center text-[13px] text-neutral-500"
                  >
                    검토 중 또는 승인 완료 계약이 없습니다. 계약서 작성 화면에서
                    내용을 저장한 뒤 「확정」을 누르면 여기에 나타납니다.
                  </td>
                </tr>
              ) : (
                reviewQueue.map((d) => (
                  <tr key={d.id} className="hover:bg-neutral-50">
                    <td className="max-w-[200px] whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle">
                      <div
                        className="truncate text-[13px] font-medium text-neutral-900"
                        title={draftDisplayName(d)}
                      >
                        {draftDisplayName(d)}
                      </div>
                    </td>
                    <td className="max-w-[260px] whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle text-[13px] text-neutral-600">
                      <div className="truncate" title={d.templateLabel || '—'}>
                        {d.templateLabel || '—'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle text-[13px] text-neutral-600">
                      {d.displayVer}
                    </td>
                    <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle text-[12px] text-neutral-500">
                      {formatUpdatedAt(d.updatedAt)}
                    </td>
                    <td className="w-[min(360px,32vw)] min-w-[200px] max-w-md border-b border-neutral-100 px-4 py-3 align-middle">
                      <p
                        className="line-clamp-2 text-[12px] leading-snug text-neutral-600"
                        title={summarizeDraftBodyPreview(d, 500)}
                      >
                        {summarizeDraftBodyPreview(d)}
                      </p>
                    </td>
                    <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle">
                      <select
                        value={d.reviewStatus ?? 'pending'}
                        onChange={async (e) => {
                          const v = e.target.value as ContractReviewStatus;
                          const ok = await patchDraft(d.id, { reviewStatus: v });
                          if (ok) {
                            showToast('검토 상태를 저장했습니다', 'success');
                            void refreshDrafts();
                          }
                        }}
                        className="w-[140px] shrink-0 rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-[12px] text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                        aria-label="검토 승인 상태"
                      >
                        {REVIEW_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle">
                      {isDraftReviewApproved(d) ? (
                        <button
                          type="button"
                          data-contract-action="word-export"
                          title="승인된 계약을 Word(.docx)로 내보냅니다"
                          disabled={wordExportingId === d.id}
                          onClick={() => {
                            void (async () => {
                              setWordExportingId(d.id);
                              try {
                                await exportStoredDraftAsWordFile(d);
                              } catch (e) {
                                console.error(e);
                                showToast(
                                  'Word 파일 만들기에 실패했습니다',
                                  'warning',
                                );
                              } finally {
                                setWordExportingId((cur) =>
                                  cur === d.id ? null : cur,
                                );
                              }
                            })();
                          }}
                          className="inline-flex items-center gap-1 rounded-md border border-success-600 bg-success-50 px-2.5 py-1 text-xs font-medium text-success-900 hover:bg-success-100 disabled:opacity-60"
                        >
                          {wordExportingId === d.id
                            ? '만드는 중…'
                            : 'Word로 내보내기'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openReviewDraft(d)}
                          className="rounded-md border border-primary-300 bg-white px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-50"
                        >
                          검토로 열기
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
