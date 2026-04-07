import { useMemo } from 'react';
import type { TemplateListItem } from '../../types/managedTemplate';
import { useAppStore } from '../../store/useAppStore';
import { useTemplateListStore } from '../../store/useTemplateListStore';
import { listManagedCandidatesForSelection } from '../../lib/managedTemplateAdapter';

function toneToTemplateIcon(tone: TemplateListItem['tone']): {
  iconBg: string;
  iconStroke: string;
} {
  switch (tone) {
    case 'info':
      return { iconBg: '#E0F2FE', iconStroke: '#0369A1' };
    case 'success':
      return { iconBg: '#DCFCE7', iconStroke: '#15803D' };
    case 'warning':
      return { iconBg: '#FEF3C7', iconStroke: '#B45309' };
    case 'neutral':
      return { iconBg: '#F1F5F9', iconStroke: '#64748B' };
    default:
      return { iconBg: '#DBEAFE', iconStroke: '#1E40AF' };
  }
}

/**
 * 계약서 작성 화면의 템플릿 선택 UI는 “템플릿 관리”에 등록된 항목만 사용합니다.
 * 템플릿 관리가 비어 있으면 카드가 보이지 않습니다.
 */
export function TemplateSelector() {
  const selection = useAppStore((s) => s.selection);
  const openEditorFromManagedItem = useAppStore(
    (s) => s.openEditorFromManagedItem,
  );
  const managedItems = useTemplateListStore((s) => s.items);

  const { genre, type, doc } = selection;

  const filtered = useMemo(() => {
    // “선택 안 함”인 경우(특히 doc 미선택)에는 전체(active) 템플릿을 보여줍니다.
    if (!doc) return managedItems.filter((i) => i.status === 'active');
    return listManagedCandidatesForSelection({ genre, type, doc }, managedItems);
  }, [genre, type, doc, managedItems]);

  return (
    <div className="flex flex-col bg-white" id="editor-standard-templates">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>작성</span>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">템플릿 선택</span>
        </div>
        <div className="flex items-center gap-3 pb-4">
          <h2 className="text-lg font-bold text-neutral-900">계약서 템플릿 선택</h2>
          <span className="ml-auto hidden text-xs text-neutral-400 tablet:inline">
            템플릿 관리에 등록된 항목만 표시됩니다
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-6 px-7 py-6">
        <section className="min-w-0 border-t border-neutral-200 pt-8">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            템플릿 관리 (업로드/저장)
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-neutral-200 bg-neutral-50 px-4 py-3 text-xs text-neutral-600">
              선택한 조합에 등록된 템플릿이 없습니다.
            </div>
          ) : null}

          {filtered.length > 0 ? (
            <div className="grid w-full max-w-[1200px] grid-cols-1 items-stretch gap-2.5 tablet:grid-cols-2 desktop:grid-cols-4">
              {filtered.map((it) => {
                const { iconBg, iconStroke } = toneToTemplateIcon(it.tone);
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => openEditorFromManagedItem(it)}
                    className="flex h-full flex-col rounded-[8px] border-[1.5px] p-3 text-left transition-all border-neutral-200 bg-white hover:-translate-y-px hover:border-primary-300 hover:shadow-md min-h-[120px]"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={{ background: iconBg }}
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke={iconStroke}
                          strokeWidth="2"
                          aria-hidden
                        >
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                    </div>

                    <div className="mb-1 text-[12px] font-semibold text-neutral-900">
                      {it.name}
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {it.ver}
                      {it.linkedDocType ? ` · ${it.linkedDocType}` : ''}
                      {it.linkedGenre ? ` · ${it.linkedGenre}` : ''}
                    </div>
                    <div className="mt-1 text-[9px] text-neutral-400">
                      조항 {it.clauseCount}개
                    </div>
                  </button>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
