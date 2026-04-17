import { useCallback, useEffect, useMemo, useState } from 'react';
import { deleteDraft, listDrafts, patchDraft } from '../lib/contractDraftDb';
import {
  isDraftReviewApproved,
  matchesContractListTab,
  type ContractListTab,
} from '../lib/contractListFilter';
import type {
  ContractReviewStatus,
  StoredContractDraft,
} from '../lib/contractDraftTypes';
import { summarizeDraftBodyPreview } from '../lib/contractDraftSummary';
import { draftBelongsToEmployee } from '../lib/draftOwnership';
import { exportStoredDraftAsWordFile } from '../lib/persistContractDraft';
import { canAccessUserManagement } from '../lib/userManagementPolicy';
import { canPerformContractReviewByDepartment } from '../lib/versionReviewPolicy';
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

/** 목록 `검토/승인` 배지 — 단계별 색 구분 */
function reviewApprovalBadgeClass(status: ContractReviewStatus): string {
  switch (status) {
    case 'in_review':
      return 'border-warning-300 bg-warning-50 text-warning-900';
    case 'approved':
      return 'border-success-300 bg-success-50 text-success-900';
    case 'rejected':
      return 'border-danger-300 bg-danger-50 text-danger-900';
    default:
      return 'border-info-300 bg-info-50 text-info-900';
  }
}

const LIST_TABS: { id: ContractListTab; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'draft', label: '초안' },
  { id: 'in_review', label: '검토 중' },
  { id: 'done', label: '완료' },
  { id: 'archived', label: '보관' },
];

function listStatusLabel(d: StoredContractDraft): { label: string; className: string } {
  if (d.archived) {
    return {
      label: '보관',
      className: 'bg-neutral-200 text-neutral-700',
    };
  }
  switch (d.reviewStatus ?? 'pending') {
    case 'in_review':
      return {
        label: '검토 중',
        className: 'bg-info-100 text-info-800',
      };
    case 'approved':
      return {
        label: '완료',
        className: 'bg-success-100 text-success-800',
      };
    case 'rejected':
      return {
        label: '반려',
        className: 'bg-danger-100 text-danger-800',
      };
    default:
      return {
        label: '초안',
        className: 'bg-neutral-100 text-neutral-600',
      };
  }
}

export function ContractsPage() {
  const showEditorTemplatePicker = useAppStore((s) => s.showEditorTemplatePicker);
  const loadStoredDraft = useAppStore((s) => s.loadStoredDraft);
  const openReviewDraft = useAppStore((s) => s.openReviewDraft);
  const showToast = useAppStore((s) => s.showToast);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  /** 사용자 관리와 동일: admin 사번 또는 경영지원팀 — 전체 초안 조회·삭제 */
  const listAdminMode = canAccessUserManagement({
    employeeId: authEmployeeId,
    department: currentUserDepartment,
  });

  /** 계약서 목록에서 승인 건을 검토 UI로 열 수 있는지(경영지원팀만) */
  const canOpenApprovedInReviewUi = canPerformContractReviewByDepartment(
    currentUserDepartment,
  );

  const [drafts, setDrafts] = useState<StoredContractDraft[]>([]);
  const [wordExportingId, setWordExportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [listTab, setListTab] = useState<ContractListTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const refreshDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listDrafts();
      list.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setDrafts(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDrafts();
  }, [refreshDrafts]);

  const listedDrafts = useMemo(
    () =>
      listAdminMode
        ? drafts
        : drafts.filter((d) => draftBelongsToEmployee(d, authEmployeeId)),
    [drafts, authEmployeeId, listAdminMode],
  );

  const tabFiltered = useMemo(
    () => listedDrafts.filter((d) => matchesContractListTab(d, listTab)),
    [listedDrafts, listTab],
  );

  const visibleDrafts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return tabFiltered;
    return tabFiltered.filter((d) => {
      const name = draftDisplayName(d).toLowerCase();
      const type = (d.templateLabel || '').toLowerCase();
      return name.includes(q) || type.includes(q);
    });
  }, [tabFiltered, searchQuery]);

  const emptyMessage = (() => {
    if (listedDrafts.length === 0) {
      return listAdminMode
        ? '저장된 계약 초안이 없습니다.'
        : '현재 로그인한 계정으로 저장된 계약이 없습니다. 계약서 작성 화면에서 저장하면 여기에 표시됩니다.';
    }
    if (tabFiltered.length === 0) {
      const labels: Record<ContractListTab, string> = {
        all: '표시할 항목이 없습니다.',
        draft: '초안 상태인 계약이 없습니다.',
        in_review: '검토 중인 계약이 없습니다.',
        done: '완료된 계약이 없습니다.',
        archived: '보관된 계약이 없습니다. 목록에서 보관을 선택하면 여기에 모입니다.',
      };
      return labels[listTab];
    }
    if (visibleDrafts.length === 0) {
      return '검색 조건에 맞는 계약이 없습니다.';
    }
    return null;
  })();

  const confirmDeleteDraft = useCallback(
    (d: StoredContractDraft) => {
      const name = draftDisplayName(d);
      if (
        !window.confirm(
          `「${name}」 초안을 이 브라우저에 저장된 데이터에서 영구 삭제합니다. 복구할 수 없습니다. 계속할까요?`,
        )
      ) {
        return;
      }
      void (async () => {
        setDeletingId(d.id);
        try {
          const ok = await deleteDraft(d.id);
          if (!ok) {
            showToast('삭제할 초안을 찾을 수 없습니다', 'warning');
            return;
          }
          const st = useAppStore.getState();
          if (st.localDraftId === d.id) {
            st.closeReviewDraft();
            if (st.page === 'editor' || st.page === 'review') {
              st.setPage('contracts');
            }
          }
          showToast(`삭제했습니다 · ${name}`, 'success');
          void refreshDrafts();
        } catch (e) {
          console.error(e);
          showToast('삭제에 실패했습니다', 'warning');
        } finally {
          setDeletingId((cur) => (cur === d.id ? null : cur));
        }
      })();
    },
    [refreshDrafts, showToast],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>홈</span>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">계약서</span>
        </div>
        <div className="flex items-center gap-3 pb-4">
          <h1 className="text-xl font-bold text-neutral-900">계약서 목록</h1>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="14" y2="12" />
                <line x1="4" y1="18" x2="10" y2="18" />
              </svg>
              필터
            </button>
            <button
              type="button"
              onClick={() => showEditorTemplatePicker()}
              className="inline-flex items-center gap-1 rounded-md bg-primary-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              새 계약서
            </button>
          </div>
        </div>
        {listAdminMode ? (
          <p className="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-[12px] font-medium text-warning-900">
            관리자 모드: 모든 계정의 저장 초안이 표시됩니다. 삭제한 항목은 이
            브라우저에서 복구할 수 없습니다.
          </p>
        ) : null}
        <div className="-mx-7 flex gap-0 border-t border-neutral-200 px-7">
          {LIST_TABS.map((t) => {
            const active = listTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setListTab(t.id)}
                className={`mb-[-1px] border-b-2 px-4 py-2.5 text-[13px] font-medium transition-colors ${
                  active
                    ? 'border-primary-800 font-semibold text-primary-800'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex-1 px-7 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" aria-hidden>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-w-0 flex-1 border-0 bg-transparent text-[13px] text-neutral-700 outline-none"
              placeholder="계약서명, 고객사, 유형으로 검색..."
            />
          </div>
          <select className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] text-neutral-700">
            <option>수정일 최신순</option>
            <option>이름순</option>
            <option>상태순</option>
          </select>
          <button
            type="button"
            onClick={() => void refreshDrafts()}
            className="rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-[13px] text-neutral-700 hover:bg-neutral-50"
          >
            목록 새로고침
          </button>
        </div>
        <div className="overflow-x-auto rounded-[10px] border border-neutral-200 bg-white">
          <table className="w-full min-w-[960px] border-collapse">
            <thead>
              <tr>
                {[
                  '계약서명',
                  '유형',
                  '상태',
                  '버전',
                  '수정일',
                  '저장 요약',
                  '검토/승인',
                  '작성자',
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
                    colSpan={9}
                    className="border-b border-neutral-100 px-4 py-12 text-center text-[13px] text-neutral-500"
                  >
                    저장된 초안을 불러오는 중…
                  </td>
                </tr>
              ) : emptyMessage ? (
                <tr>
                  <td
                    colSpan={9}
                    className="border-b border-neutral-100 px-4 py-12 text-center text-[13px] text-neutral-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                visibleDrafts.map((d) => {
                  const author = d.auditEntries[0]?.author ?? '—';
                  const st = listStatusLabel(d);
                  /** 승인: API·저장값 + 목록 상태열「완료」와 동일 조건(둘 중 하나라도 맞으면 Word만) */
                  const isApprovedRow =
                    isDraftReviewApproved(d) ||
                    (!d.archived && st.label === '완료');
                  return (
                    <tr key={d.id} className="hover:bg-neutral-50">
                      <td className="max-w-[200px] whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle">
                        <div className="truncate text-[13px] font-medium text-neutral-900" title={draftDisplayName(d)}>
                          {draftDisplayName(d)}
                        </div>
                      </td>
                      <td className="max-w-[260px] whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle text-[13px] text-neutral-600">
                        <div className="truncate" title={d.templateLabel || '—'}>
                          {d.templateLabel || '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
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
                        <span
                          className={`inline-flex rounded-md border px-2 py-1 text-[12px] font-medium ${reviewApprovalBadgeClass(
                            d.reviewStatus ?? 'pending',
                          )}`}
                          title="계약서 목록에서는 검토/승인 상태를 수정할 수 없습니다. 검토 화면에서 변경하세요."
                        >
                          {REVIEW_OPTIONS.find(
                            (o) => o.value === (d.reviewStatus ?? 'pending'),
                          )?.label ?? '대기'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle text-[12px] text-neutral-500">
                        {author}
                      </td>
                      <td className="whitespace-nowrap border-b border-neutral-100 px-4 py-3 align-middle">
                        <div className="flex flex-nowrap items-center gap-1.5 [&_button]:shrink-0">
                          {isApprovedRow ? (
                            <>
                              <button
                                type="button"
                                title="승인된 계약을 Word(.docx)로 저장합니다"
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
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                aria-hidden
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                              {wordExportingId === d.id
                                ? '만드는 중…'
                                : 'Word로 내보내기'}
                            </button>
                            {canOpenApprovedInReviewUi ? (
                              <button
                                type="button"
                                title="검토 화면에서 열람·감사 로그를 확인합니다"
                                onClick={() => openReviewDraft(d)}
                                className="rounded-md border border-primary-300 bg-white px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-50"
                              >
                                검토로 열기
                              </button>
                            ) : null}
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => loadStoredDraft(d)}
                              className="rounded-md border border-primary-300 bg-white px-2.5 py-1 text-xs font-medium text-primary-800 hover:bg-primary-50"
                            >
                              작성에서 열기
                            </button>
                          )}
                          {d.archived ? (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await patchDraft(d.id, {
                                  archived: false,
                                });
                                if (ok) {
                                  showToast('보관을 해제했습니다', 'success');
                                  void refreshDrafts();
                                }
                              }}
                              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                            >
                              보관 해제
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                const ok = await patchDraft(d.id, {
                                  archived: true,
                                });
                                if (ok) {
                                  showToast('보관했습니다', 'success');
                                  void refreshDrafts();
                                }
                              }}
                              className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                            >
                              보관
                            </button>
                          )}
                          {listAdminMode ? (
                            <button
                              type="button"
                              disabled={deletingId === d.id}
                              onClick={() => confirmDeleteDraft(d)}
                              className="rounded-md border border-danger-300 bg-white px-2.5 py-1 text-xs font-medium text-danger-800 hover:bg-danger-50 disabled:opacity-60"
                            >
                              {deletingId === d.id ? '삭제 중…' : '삭제'}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
