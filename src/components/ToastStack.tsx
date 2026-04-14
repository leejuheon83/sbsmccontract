import { useAppStore } from '../store/useAppStore';

function toastVisual(type: 'success' | 'info' | 'warning'): {
  iconBg: string;
  icon: string;
} {
  switch (type) {
    case 'success':
      return { iconBg: 'bg-success-700', icon: '💾' };
    case 'warning':
      return { iconBg: 'bg-warning-700', icon: '⚠' };
    default:
      return { iconBg: 'bg-neutral-700', icon: '✎' };
  }
}

/** 화면 우하단: 감사 로그와 유사한 카드가 잠시 보였다가 자동으로 사라짐 */
export function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);
  const visible = toasts.slice(-5);

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[100] flex max-w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
      aria-relevant="additions"
    >
      {visible.map((t) => {
        const { iconBg, icon } = toastVisual(t.type);
        return (
          <div
            key={t.id}
            className="animate-toast-in pointer-events-auto flex gap-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-3 shadow-lg ring-1 ring-black/5"
          >
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs text-white ${iconBg}`}
              aria-hidden
            >
              {icon}
            </div>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[13px] font-semibold leading-snug text-neutral-900">
                {t.msg}
              </p>
              <p className="mt-0.5 text-[11px] text-neutral-500">{t.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
