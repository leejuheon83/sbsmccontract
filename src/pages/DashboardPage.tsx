import { useCallback, useEffect, useMemo, useState } from 'react';
import { draftBelongsToEmployee } from '../lib/draftOwnership';
import { listDrafts } from '../lib/contractDraftDb';
import type { StoredContractDraft } from '../lib/contractDraftTypes';
import { greetingFirstNameFromRegisteredName } from '../lib/userDisplayName';
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

function isThisMonth(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function listStatusLabel(
  d: StoredContractDraft,
): { label: string; className: string } {
  if (d.archived) {
    return { label: '보관', className: 'bg-neutral-200 text-neutral-700' };
  }
  switch (d.reviewStatus ?? 'pending') {
    case 'in_review':
      return { label: '검토 중', className: 'bg-info-100 text-info-800' };
    case 'approved':
      return { label: '완료', className: 'bg-success-100 text-success-800' };
    case 'rejected':
      return { label: '반려', className: 'bg-danger-100 text-danger-800' };
    default:
      return { label: '초안', className: 'bg-neutral-100 text-neutral-600' };
  }
}

export function DashboardPage() {
  const setPage = useAppStore((s) => s.setPage);
  const showEditorTemplatePicker = useAppStore((s) => s.showEditorTemplatePicker);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);
  const authDisplayName = useAppStore((s) => s.authDisplayName);

  const [drafts, setDrafts] = useState<StoredContractDraft[]>([]);
  const [loading, setLoading] = useState(true);

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

  const greetingName = useMemo(() => {
    const n = authDisplayName?.trim();
    if (n) return greetingFirstNameFromRegisteredName(n);
    return authEmployeeId?.trim() || '사용자';
  }, [authDisplayName, authEmployeeId]);

  const myDrafts = useMemo(
    () => drafts.filter((d) => draftBelongsToEmployee(d, authEmployeeId)),
    [drafts, authEmployeeId],
  );

  const myTotal = myDrafts.length;
  const myInReview = useMemo(
    () =>
      myDrafts.filter(
        (d) => !d.archived && (d.reviewStatus ?? 'pending') === 'in_review',
      ).length,
    [myDrafts],
  );
  const myCompletedThisMonth = useMemo(
    () =>
      myDrafts.filter(
        (d) =>
          !d.archived &&
          d.reviewStatus === 'approved' &&
          isThisMonth(d.updatedAt),
      ).length,
    [myDrafts],
  );

  const recentMine = useMemo(() => myDrafts.slice(0, 5), [myDrafts]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>홈</span>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">대시보드</span>
        </div>
        <div className="flex items-center gap-3 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            안녕하세요, {greetingName}님 👋
          </h1>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              검색
            </button>
            <button
              type="button"
              onClick={() => showEditorTemplatePicker()}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              새 계약서
            </button>
          </div>
        </div>
      </div>
      <div className="flex-1 px-7 py-6">
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 wide:grid-cols-4">
          <div className="rounded-[10px] border border-neutral-200 bg-white px-5 py-[18px] transition-shadow hover:shadow-md">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#1E40AF"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-500">
              내 계약서 (전체)
            </div>
            <div className="mb-1.5 text-[28px] font-bold leading-none tracking-tight text-neutral-900">
              {loading ? '…' : myTotal}
            </div>
            <div className="text-[11px] text-neutral-400">
              {loading
                ? '불러오는 중…'
                : myTotal === 0
                  ? '저장한 내 계약이 없습니다'
                  : '로그인 계정 기준으로 집계'}
            </div>
          </div>
          <div className="rounded-[10px] border border-neutral-200 bg-white px-5 py-[18px] transition-shadow hover:shadow-md">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-warning-100">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#B45309"
                strokeWidth="2"
                aria-hidden
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <div className="mb-2 text-xs font-medium text-neutral-500">검토 대기</div>
            <div className="mb-1.5 text-[28px] font-bold leading-none text-warning-700">
              {loading ? '…' : myInReview}
            </div>
            <div className="text-[11px] text-neutral-400">
              {myInReview === 0 && !loading
                ? '검토 중인 내 계약이 없습니다'
                : '검토 중 상태 건수'}
            </div>
          </div>
          <div className="rounded-[10px] border border-neutral-200 bg-white px-5 py-[18px] transition-shadow hover:shadow-md">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-success-100">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#15803D"
                strokeWidth="2"
                aria-hidden
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <div className="mb-2 text-xs font-medium text-neutral-500">이번 달 완료</div>
            <div className="mb-1.5 text-[28px] font-bold leading-none text-success-700">
              {loading ? '…' : myCompletedThisMonth}
            </div>
            <div className="text-[11px] text-neutral-400">
              {myCompletedThisMonth === 0 && !loading
                ? '이번 달 승인 완료 건이 없습니다'
                : '승인 완료·이번 달 수정분'}
            </div>
          </div>
          <div className="rounded-[10px] border border-neutral-200 bg-white px-5 py-[18px] transition-shadow hover:shadow-md">
            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-info-100">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#0369A1"
                strokeWidth="2"
                aria-hidden
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
            </div>
            <div className="mb-2 text-xs font-medium text-neutral-500">
              평균 초안 생성시간
            </div>
            <div className="mb-1.5 text-[28px] font-bold leading-none text-info-700">
              —
            </div>
            <div className="text-[11px] text-neutral-400">집계 데이터가 없습니다</div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 wide:grid-cols-[1fr_380px]">
          <div className="overflow-hidden rounded-[10px] border border-neutral-200 bg-white">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <span className="text-sm font-semibold text-neutral-900">최근 계약서</span>
              <button
                type="button"
                onClick={() => setPage('contracts')}
                className="cursor-pointer text-xs font-medium text-primary-700 hover:text-primary-800 hover:underline"
              >
                전체 보기 →
              </button>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    계약서명
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    유형
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    상태
                  </th>
                  <th className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                    수정일
                  </th>
                </tr>
              </thead>
              <tbody>
                {!loading && recentMine.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="border-b border-neutral-100 px-4 py-10 text-center text-[13px] text-neutral-500"
                    >
                      내 계약이 없습니다. 새 계약서를 만들고 저장하면 여기에 표시됩니다.
                    </td>
                  </tr>
                ) : null}
                {recentMine.map((d) => {
                  const st = listStatusLabel(d);
                  return (
                    <tr key={d.id} className="hover:bg-neutral-50">
                      <td className="border-b border-neutral-100 px-4 py-3 text-[13px] font-medium text-neutral-900">
                        {draftDisplayName(d)}
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3 text-[12px] text-neutral-600">
                        {d.templateLabel || '—'}
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="border-b border-neutral-100 px-4 py-3 text-[12px] text-neutral-500">
                        {formatUpdatedAt(d.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="overflow-hidden rounded-[10px] border border-neutral-200 bg-white">
            <div className="border-b border-neutral-200 px-5 py-4">
              <span className="text-sm font-semibold text-neutral-900">최근 활동</span>
            </div>
            <div className="px-5 py-10 text-center text-[13px] text-neutral-500">
              최근 활동이 없습니다. 계약 저장·보내기 등이 연동되면 여기에 표시됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
