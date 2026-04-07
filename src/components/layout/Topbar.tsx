import { USER_DEPARTMENTS } from '../../lib/userDepartments';
import { useAppStore } from '../../store/useAppStore';

export function Topbar() {
  const showToast = useAppStore((s) => s.showToast);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  const setCurrentUserDepartment = useAppStore(
    (s) => s.setCurrentUserDepartment,
  );

  return (
    <header className="sticky top-0 z-50 flex h-topbar shrink-0 items-center gap-4 border-b border-neutral-200/50 bg-white/70 px-5 shadow-[0_1px_0_0_rgba(15,23,42,0.06)] backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-white/60">
      <div className="flex min-w-0 max-w-[min(100%,360px)] shrink-0 items-center gap-3">
        <img
          src="/sbs-mc-logo.png"
          alt="SBS M&C"
          className="h-8 w-auto max-w-[168px] shrink-0 object-contain object-left"
          decoding="async"
        />
        <p className="min-w-0 truncate font-sans text-[1.375rem] font-semibold leading-none tracking-tight text-neutral-800 sm:text-2xl">
          계약서 자동화
        </p>
      </div>

      <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor="topbar-dept"
            className="text-[11px] font-medium text-neutral-500"
          >
            부서
          </label>
          <select
            id="topbar-dept"
            value={currentUserDepartment}
            onChange={(e) => setCurrentUserDepartment(e.target.value)}
            className="max-w-[140px] rounded-md border border-neutral-200 bg-white px-2 py-1 text-[11px] text-neutral-800 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
          >
            {USER_DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          className="relative flex h-[34px] w-[34px] items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          onClick={() => showToast('새 알림 3건이 있습니다', 'info')}
          aria-label="알림"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="absolute right-[5px] top-[5px] h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-danger-700" />
        </button>
        <div className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-200/80 bg-white/85 py-1 pl-1 pr-2.5 shadow-sm transition-colors hover:bg-white">
          <div className="flex h-[26px] w-[26px] items-center justify-center rounded-md bg-primary-800 text-[11px] font-bold text-white">
            이
          </div>
          <span className="text-xs font-medium text-neutral-700">이주헌</span>
          <span className="rounded bg-neutral-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            admin
          </span>
        </div>
      </div>
    </header>
  );
}
