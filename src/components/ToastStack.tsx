import { useAppStore } from '../store/useAppStore';

const icons: Record<string, string> = {
  success: '✓',
  info: 'ℹ',
  warning: '⚠',
};

export function ToastStack() {
  const toasts = useAppStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex min-w-[280px] items-center gap-2.5 rounded-lg px-4 py-3 text-[13px] font-medium text-white shadow-lg ${
            t.type === 'success'
              ? 'bg-success-700'
              : t.type === 'warning'
                ? 'bg-warning-700'
                : 'bg-primary-800'
          }`}
        >
          <span>{icons[t.type] ?? '•'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
