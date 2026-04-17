import { useAppStore } from '../../store/useAppStore';
import { TemplateSelector } from './TemplateSelector';

export function EditorTemplateStage() {
  const title = useAppStore((s) => s.contractDocumentTitle);
  const setTitle = useAppStore((s) => s.setContractDocumentTitle);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-neutral-50/80">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 py-4">
        <p className="mb-3 text-[11px] font-medium text-neutral-500">
          계약서 제목을 입력하고, 아래 템플릿 카드를 선택하면 조항 편집이 시작됩니다.
        </p>
        <label
          htmlFor="contract-doc-title"
          className="mb-1 block text-xs font-semibold text-neutral-800"
        >
          계약서 제목
        </label>
        <input
          id="contract-doc-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 2026 예능 마케팅 라이선스 계약"
          className="w-full max-w-2xl rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
        />
      </div>

      <TemplateSelector />
    </div>
  );
}
