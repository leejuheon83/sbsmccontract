import { useMemo } from 'react';
import type { PageId } from '../../store/useAppStore';
import { useAppStore } from '../../store/useAppStore';
import { canAccessUserManagement } from '../../lib/userManagementPolicy';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from '../../lib/userDepartments';

const BASE_BUTTONS: { id: PageId; label: string }[] = [
  { id: 'dashboard', label: '대시보드' },
  { id: 'contracts', label: '계약서 목록' },
  { id: 'editor', label: '계약서 작성' },
  { id: 'templates', label: '템플릿 관리' },
  { id: 'admin', label: '사용자 관리' },
];

export function PageNavBar() {
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);

  const buttons = useMemo(() => {
    const base = canAccessUserManagement({
      employeeId: authEmployeeId,
      department: currentUserDepartment,
    })
      ? BASE_BUTTONS
      : BASE_BUTTONS.filter((b) => b.id !== 'admin');

    if (currentUserDepartment.trim() !== MANAGEMENT_SUPPORT_DEPARTMENT) {
      return base;
    }
    const idx = base.findIndex((b) => b.id === 'editor');
    if (idx < 0) return base;
    return [
      ...base.slice(0, idx + 1),
      { id: 'review' as const, label: '계약서 검토' },
      ...base.slice(idx + 1),
    ];
  }, [authEmployeeId, currentUserDepartment]);

  return (
    <div className="flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-auto border-b border-neutral-200 bg-neutral-100 px-7 py-3">
      <span className="mr-1 shrink-0 whitespace-nowrap text-[11px] leading-[26px] text-neutral-500">
        화면 전환:
      </span>
      {buttons.map((b) => (
        <button
          key={b.id}
          type="button"
          onClick={() => setPage(b.id)}
          className={`shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            page === b.id
              ? 'border-primary-800 bg-primary-800 text-white'
              : 'border-neutral-300 bg-white text-neutral-600 hover:border-primary-800 hover:bg-primary-800 hover:text-white'
          }`}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
}
