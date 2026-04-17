import { Bell, User } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function Topbar() {
  const showToast = useAppStore((s) => s.showToast);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);
  const authDisplayName = useAppStore((s) => s.authDisplayName);
  const logout = useAppStore((s) => s.logout);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);

  const profileLabel = authDisplayName?.trim() || authEmployeeId || '';

  return (
    <header className="sticky top-0 z-50 flex h-topbar min-w-0 shrink-0 items-center gap-5 overflow-x-auto bg-white px-5 shadow-[0_1px_2px_0_rgb(60_64_67_/_0.15),0_2px_6px_2px_rgb(60_64_67_/_0.1)] tablet:px-8">
      <div className="flex min-w-0 max-w-[min(100%,380px)] shrink-0 flex-nowrap items-center gap-4">
        <img
          src="/sbs-mc-logo.png"
          alt="SBS M&C"
          className="h-9 w-auto max-w-[176px] shrink-0 object-contain object-left"
          decoding="async"
        />
        <span
          className="hidden h-7 w-px shrink-0 bg-neutral-200 tablet:block"
          aria-hidden
        />
        <h1 className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <span
            className="inline-flex items-center rounded-lg px-2.5 py-1 text-[1.25rem] font-extrabold tracking-tight tablet:text-[1.45rem]"
            style={{
              background: 'linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            IMC
          </span>
          <span className="text-[1.1rem] font-bold tracking-tight text-neutral-800 tablet:text-[1.25rem]">
            계약서 자동화
          </span>
          <span className="ml-0.5 rounded-md bg-gradient-to-r from-blue-600 to-indigo-600 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white shadow-sm">
            Beta
          </span>
        </h1>
      </div>

      <div className="ml-auto flex shrink-0 flex-nowrap items-center justify-end gap-3">
        <div className="flex min-w-0 shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap">
          <span className="shrink-0 text-xs font-medium text-[#5f6368]">
            부서
          </span>
          <span
            className="max-w-[200px] shrink truncate rounded-full border border-[#dadce0] bg-[#f8f9fa] px-3 py-1.5 text-xs font-medium text-[#202124]"
            title={currentUserDepartment}
          >
            {currentUserDepartment}
          </span>
        </div>
        <button
          type="button"
          className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#5f6368] transition-colors hover:bg-[#f1f3f4] hover:text-[#202124]"
          onClick={() => showToast('새 알림 3건이 있습니다', 'info')}
          aria-label="알림"
        >
          <Bell className="h-[22px] w-[22px]" strokeWidth={1.75} aria-hidden />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-[#ea4335]" />
        </button>
        <div className="flex shrink-0 flex-nowrap items-center gap-2 whitespace-nowrap rounded-full border border-[#dadce0] bg-[#f8f9fa] py-1 pl-1 pr-1.5">
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white"
            aria-hidden
          >
            <User className="h-4 w-4" strokeWidth={2.25} />
          </div>
          <span className="max-w-[140px] shrink truncate text-xs font-medium text-[#202124]">
            {profileLabel || '—'}
          </span>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('로그아웃할까요?')) logout();
            }}
            className="rounded-full px-3 py-1.5 text-xs font-medium text-primary-800 transition-colors hover:bg-[#e8f0fe]"
          >
            로그아웃
          </button>
        </div>
      </div>
    </header>
  );
}
