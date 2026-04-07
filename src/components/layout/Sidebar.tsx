import { useMemo } from 'react';
import type { PageId } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from '../../lib/userDepartments';

const NAV_MAIN_BASE: {
  page: PageId;
  label: string;
  badge?: string;
  count?: string;
}[] = [
  { page: 'dashboard', label: '대시보드' },
  { page: 'contracts', label: '계약서', count: '12' },
  { page: 'editor', label: '계약서 작성' },
];

const NAV_ADMIN: { page: PageId; label: string }[] = [
  { page: 'templates', label: '템플릿' },
  { page: 'admin', label: '사용자 관리' },
];

function iconFor(page: PageId) {
  switch (page) {
    case 'dashboard':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect x="3" y="3" width="7" height="7" />
          <rect x="14" y="3" width="7" height="7" />
          <rect x="14" y="14" width="7" height="7" />
          <rect x="3" y="14" width="7" height="7" />
        </svg>
      );
    case 'contracts':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'editor':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      );
    case 'review':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'templates':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 9h18M9 21V9" />
        </svg>
      );
    case 'admin':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    default:
      return null;
  }
}

export function Sidebar() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);

  const navMain = useMemo(() => {
    if (currentUserDepartment.trim() !== MANAGEMENT_SUPPORT_DEPARTMENT) {
      return NAV_MAIN_BASE;
    }
    const idx = NAV_MAIN_BASE.findIndex((b) => b.page === 'editor');
    if (idx < 0) return NAV_MAIN_BASE;
    return [
      ...NAV_MAIN_BASE.slice(0, idx + 1),
      { page: 'review' as const, label: '계약서 검토' },
      ...NAV_MAIN_BASE.slice(idx + 1),
    ];
  }, [currentUserDepartment]);

  const renderItem = (item: (typeof NAV_MAIN_BASE)[0]) => {
    const active = page === item.page;
    return (
      <button
        key={item.page}
        type="button"
        onClick={() => setPage(item.page)}
        className={`relative mb-px flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors ${
          active
            ? '-mr-px border-r-2 border-primary-800 bg-primary-50 font-semibold text-primary-800'
            : 'font-normal text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
        }`}
      >
        {iconFor(item.page)}
        {item.label}
        {item.badge ? (
          <span className="ml-auto rounded-full bg-danger-700 px-1.5 py-px text-[10px] font-bold text-white">
            {item.badge}
          </span>
        ) : null}
        {item.count ? (
          <span className="ml-auto text-[11px] text-neutral-400">{item.count}</span>
        ) : null}
      </button>
    );
  };

  return (
    <aside className="flex w-sidebar shrink-0 flex-col overflow-y-auto border-r border-neutral-200 bg-white py-3">
      <nav className="px-3">{navMain.map(renderItem)}</nav>
      <nav className="mt-2 px-3">
        <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          관리
        </div>
        {NAV_ADMIN.map(renderItem)}
      </nav>
    </aside>
  );
}
