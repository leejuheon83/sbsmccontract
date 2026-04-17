import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type CSSProperties,
  type ReactNode,
} from 'react';
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
  return (
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  );
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

/* ── 3D Tilt Card ── */
function TiltCard({
  children,
  className = '',
  gradient,
  glowColor = 'rgba(59,130,246,0.08)',
}: {
  children: ReactNode;
  className?: string;
  gradient?: string;
  glowColor?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});
  const raf = useRef(0);

  const handleMove = useCallback(
    (e: ReactMouseEvent) => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        const rotateY = (x - 0.5) * 14;
        const rotateX = (0.5 - y) * 14;
        setStyle({
          transform: `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02,1.02,1.02)`,
          boxShadow: `0 8px 32px ${glowColor}, 0 2px 8px rgba(0,0,0,0.06)`,
        });
      });
    },
    [glowColor],
  );

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setStyle({
      transform:
        'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
    });
  }, []);

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={`relative overflow-hidden rounded-2xl border border-white/60 px-5 py-5 ${className}`}
      style={{
        transition: 'transform 0.25s cubic-bezier(.03,.98,.52,.99), box-shadow 0.35s ease',
        willChange: 'transform',
        transformStyle: 'preserve-3d',
        background: gradient ?? 'rgba(255,255,255,0.82)',
        backdropFilter: 'blur(12px)',
        boxShadow:
          '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
        ...style,
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at var(--glow-x,50%) var(--glow-y,50%), rgba(255,255,255,0.25) 0%, transparent 70%)',
          opacity: style.transform?.includes('scale3d(1.02') ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}

/* ── Magnetic Button ── */
function MagneticButton({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const raf = useRef(0);

  const handleMove = useCallback((e: ReactMouseEvent) => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      setOffset({
        x: (e.clientX - cx) * 0.25,
        y: (e.clientY - cy) * 0.25,
      });
    });
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setOffset({ x: 0, y: 0 });
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: offset.x === 0 ? 'transform 0.45s cubic-bezier(.25,.46,.45,.94)' : 'transform 0.12s ease-out',
      }}
    >
      {children}
    </button>
  );
}

/* ── Stat card configs ── */
const STAT_CARDS: Array<{
  key: string;
  label: string;
  gradient: string;
  glowColor: string;
  iconBg: string;
  valueColor: string;
  icon: ReactNode;
}> = [
  {
    key: 'total',
    label: '내 계약서 (전체)',
    gradient:
      'linear-gradient(135deg, rgba(239,246,255,0.92) 0%, rgba(219,234,254,0.72) 100%)',
    glowColor: 'rgba(59,130,246,0.12)',
    iconBg: 'bg-blue-100',
    valueColor: 'text-blue-900',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#2563EB"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
  },
  {
    key: 'review',
    label: '검토 대기',
    gradient:
      'linear-gradient(135deg, rgba(255,251,235,0.92) 0%, rgba(254,243,199,0.72) 100%)',
    glowColor: 'rgba(245,158,11,0.12)',
    iconBg: 'bg-amber-100',
    valueColor: 'text-amber-800',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#D97706"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    key: 'completed',
    label: '이번 달 완료',
    gradient:
      'linear-gradient(135deg, rgba(240,253,244,0.92) 0%, rgba(220,252,231,0.72) 100%)',
    glowColor: 'rgba(34,197,94,0.12)',
    iconBg: 'bg-emerald-100',
    valueColor: 'text-emerald-800',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#16A34A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    key: 'avg',
    label: '평균 초안 생성시간',
    gradient:
      'linear-gradient(135deg, rgba(238,242,255,0.92) 0%, rgba(224,231,255,0.72) 100%)',
    glowColor: 'rgba(99,102,241,0.12)',
    iconBg: 'bg-indigo-100',
    valueColor: 'text-indigo-800',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#4F46E5"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
];

export function DashboardPage() {
  const setPage = useAppStore((s) => s.setPage);
  const showEditorTemplatePicker = useAppStore(
    (s) => s.showEditorTemplatePicker,
  );
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

  const statValues: Record<string, { value: string; sub: string }> = {
    total: {
      value: loading ? '…' : String(myTotal),
      sub: loading
        ? '불러오는 중…'
        : myTotal === 0
          ? '저장한 내 계약이 없습니다'
          : '로그인 계정 기준으로 집계',
    },
    review: {
      value: loading ? '…' : String(myInReview),
      sub:
        myInReview === 0 && !loading
          ? '검토 중인 내 계약이 없습니다'
          : '검토 중 상태 건수',
    },
    completed: {
      value: loading ? '…' : String(myCompletedThisMonth),
      sub:
        myCompletedThisMonth === 0 && !loading
          ? '이번 달 승인 완료 건이 없습니다'
          : '승인 완료·이번 달 수정분',
    },
    avg: {
      value: '—',
      sub: '집계 데이터가 없습니다',
    },
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* header */}
      <div
        className="shrink-0 border-b border-neutral-200/60 px-7 pb-0 pt-5"
        style={{
          background:
            'linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(255,255,255,1) 100%)',
        }}
      >
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>홈</span>
          <span className="text-neutral-300">›</span>
          <span className="font-medium text-neutral-700">대시보드</span>
        </div>
        <div className="flex items-center gap-3 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            안녕하세요, {greetingName}님 👋
          </h1>
          <div className="ml-auto flex gap-2.5">
            <MagneticButton className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white/80 px-3.5 py-2 text-xs font-semibold text-neutral-600 shadow-sm backdrop-blur-sm hover:border-neutral-300 hover:bg-white hover:shadow-md">
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
            </MagneticButton>
            <MagneticButton
              onClick={() => showEditorTemplatePicker()}
              className="group relative inline-flex items-center gap-1.5 overflow-hidden rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30"
            >
              <span
                className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-0"
                style={{
                  background:
                    'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                }}
              />
              <span
                className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                style={{
                  background:
                    'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                }}
              />
              <svg
                viewBox="0 0 24 24"
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="relative z-10"
                aria-hidden
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              <span className="relative z-10">새 계약서</span>
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* body */}
      <div
        className="flex-1 px-7 py-6"
        style={{
          background:
            'linear-gradient(180deg, #F1F5F9 0%, #F8FAFC 40%, #FFFFFF 100%)',
        }}
      >
        {/* stat cards */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 wide:grid-cols-4">
          {STAT_CARDS.map((card) => {
            const v = statValues[card.key]!;
            return (
              <TiltCard
                key={card.key}
                gradient={card.gradient}
                glowColor={card.glowColor}
              >
                <div
                  className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.iconBg}`}
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
                >
                  {card.icon}
                </div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  {card.label}
                </div>
                <div
                  className={`mb-1.5 text-[32px] font-extrabold leading-none tracking-tighter ${card.valueColor}`}
                >
                  {v.value}
                </div>
                <div className="text-[11px] font-medium text-neutral-400/80">
                  {v.sub}
                </div>
              </TiltCard>
            );
          })}
        </div>

        {/* tables */}
        <div className="grid grid-cols-1 gap-5 wide:grid-cols-[1fr_380px]">
          <div
            className="overflow-x-auto rounded-2xl border border-white/60"
            style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(12px)',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <span className="text-sm font-bold text-neutral-900">
                최근 계약서
              </span>
              <MagneticButton
                onClick={() => setPage('contracts')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                전체 보기 →
              </MagneticButton>
            </div>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  {['계약서명', '유형', '상태', '수정일'].map((h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-neutral-100 bg-neutral-50/50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-neutral-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && recentMine.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-[13px] text-neutral-400"
                    >
                      내 계약이 없습니다. 새 계약서를 만들고 저장하면 여기에
                      표시됩니다.
                    </td>
                  </tr>
                ) : null}
                {recentMine.map((d) => {
                  const st = listStatusLabel(d);
                  return (
                    <tr
                      key={d.id}
                      className="transition-colors hover:bg-blue-50/30"
                    >
                      <td className="max-w-[200px] whitespace-nowrap border-b border-neutral-100/60 px-4 py-3 align-middle">
                        <div
                          className="truncate text-[13px] font-medium text-neutral-900"
                          title={draftDisplayName(d)}
                        >
                          {draftDisplayName(d)}
                        </div>
                      </td>
                      <td className="max-w-[220px] whitespace-nowrap border-b border-neutral-100/60 px-4 py-3 align-middle text-[12px] text-neutral-500">
                        <div className="truncate" title={d.templateLabel || '—'}>
                          {d.templateLabel || '—'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap border-b border-neutral-100/60 px-4 py-3 align-middle">
                        <span
                          className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${st.className}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap border-b border-neutral-100/60 px-4 py-3 align-middle text-[12px] text-neutral-400">
                        {formatUpdatedAt(d.updatedAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-white/60"
            style={{
              background: 'rgba(255,255,255,0.82)',
              backdropFilter: 'blur(12px)',
              boxShadow:
                '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)',
            }}
          >
            <div className="border-b border-neutral-100 px-5 py-4">
              <span className="text-sm font-bold text-neutral-900">
                최근 활동
              </span>
            </div>
            <div className="px-5 py-10 text-center text-[13px] text-neutral-400">
              최근 활동이 없습니다. 계약 저장·보내기 등이 연동되면 여기에
              표시됩니다.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
