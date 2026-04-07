import type { ReactNode } from 'react';

type Tone = 'danger' | 'warning' | 'primary';

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = '취소',
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: Tone;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const confirmClass =
    tone === 'danger'
      ? 'bg-danger-700 hover:bg-danger-600'
      : tone === 'warning'
        ? 'bg-warning-700 hover:bg-warning-600'
        : 'bg-primary-800 hover:bg-primary-700';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/40 p-4"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-[10px] border border-neutral-200 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title" className="text-base font-bold text-neutral-900">
          {title}
        </h2>
        <div className="mt-2 text-sm text-neutral-600">{message}</div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-3 py-2 text-sm font-medium text-white ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
