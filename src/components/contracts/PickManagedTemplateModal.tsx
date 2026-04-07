import type { TemplateListItem } from '../../types/managedTemplate';

export function PickManagedTemplateModal({
  open,
  onClose,
  items,
  selectedId,
  onSelect,
  title = '계약서 템플릿 선택',
  subtitle = '템플릿 메뉴에 등록된 활성 항목에서 기본 템플릿을 고릅니다.',
}: {
  open: boolean;
  onClose: () => void;
  items: TemplateListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  title?: string;
  subtitle?: string;
}) {
  if (!open) return null;

  const actives = items
    .filter((i) => i.status === 'active')
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-tpl-title"
        className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-[10px] border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-neutral-100 px-5 py-4">
          <h2 id="pick-tpl-title" className="text-lg font-bold text-neutral-900">
            {title}
          </h2>
          <p className="mt-1 text-xs text-neutral-500">{subtitle}</p>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {actives.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-neutral-500">
              사용 가능한 템플릿이 없습니다. 템플릿 메뉴에서 항목을 추가하세요.
            </li>
          ) : (
            actives.map((it) => {
              const on = it.id === selectedId;
              return (
                <li key={it.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(it.id);
                      onClose();
                    }}
                    className={`flex w-full flex-col gap-0.5 rounded-lg px-3 py-3 text-left transition-colors ${
                      on
                        ? 'bg-primary-50 ring-1 ring-inset ring-primary-200'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <span className="text-sm font-semibold text-neutral-900">{it.name}</span>
                    <span className="text-xs text-neutral-500">
                      {it.ver}
                      {it.linkedDocType ? ` · ${it.linkedDocType}` : ''}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
        <div className="flex justify-end border-t border-neutral-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
