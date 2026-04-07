import { useState } from 'react';
import { getAvailableDocTypes, useAppStore } from '../../store/useAppStore';
import { TemplateSelector } from './TemplateSelector';

/**
 * 계약서 작성: 첫 화면에서 「계약서 생성」→ 제목·매트릭스·템플릿 선택 후 조항 편집으로 연결.
 */
export function EditorTemplateStage() {
  const [wizardOpen, setWizardOpen] = useState(false);

  const title = useAppStore((s) => s.contractDocumentTitle);
  const setTitle = useAppStore((s) => s.setContractDocumentTitle);
  const selection = useAppStore((s) => s.selection);
  const selectGenre = useAppStore((s) => s.selectGenre);
  const selectType = useAppStore((s) => s.selectType);
  const selectDoc = useAppStore((s) => s.selectDoc);
  const resetSelection = useAppStore((s) => s.resetSelection);
  const openEditor = useAppStore((s) => s.openEditor);
  const showToast = useAppStore((s) => s.showToast);

  const handleStartMatrixEditor = () => {
    const t = title.trim();
    if (!t) {
      showToast('계약서 제목을 입력해 주세요.', 'warning');
      return;
    }
    if (!selection.genre || !selection.type || !selection.doc) {
      showToast(
        '장르·계약형태·계약서 유형을 모두 선택한 뒤 조항 편집 시작을 눌러 주세요.',
        'warning',
      );
      return;
    }
    openEditor();
  };

  if (!wizardOpen) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,#f8fafc_0%,#ffffff_45%,#eff6ff_100%)]"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -right-24 top-1/4 h-[420px] w-[420px] rounded-full bg-primary-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -left-32 bottom-0 h-[320px] w-[320px] rounded-full bg-slate-300/25 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(30,64,175,0.06),transparent)]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-10 tablet:px-10 tablet:py-14">
          <div className="flex min-h-[280px] flex-col justify-center tablet:min-h-[360px]">
            <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/65 p-8 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl ring-1 ring-neutral-200/40 tablet:p-10">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary-500/10 blur-2xl"
                  aria-hidden
                />
                <div className="relative">
                  <p className="text-[13px] font-medium text-neutral-500">시작하기</p>
                  <p className="mt-2 text-lg font-semibold leading-snug text-neutral-900">
                    새 계약서 만들기
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-neutral-600">
                    아래 버튼을 누르면 입력 폼과 템플릿 목록이 펼쳐집니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setWizardOpen(true)}
                    className="mt-8 flex w-full items-center justify-center gap-2.5 rounded-xl bg-primary-800 px-5 py-4 text-[15px] font-semibold text-white shadow-lg shadow-primary-900/20 transition-all hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-900/25 active:scale-[0.99]"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="shrink-0 opacity-95"
                      aria-hidden
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="12" y1="18" x2="12" y2="12" />
                      <line x1="9" y1="15" x2="15" y2="15" />
                    </svg>
                    계약서 생성
                  </button>
                  <p className="mt-4 text-center text-[11px] text-neutral-400">
                    템플릿 관리에 등록된 카드는 이어지는 화면에서 바로 열 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-neutral-50/80">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 py-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-medium text-neutral-500">
            제목·장르·계약형태·계약서 유형을 입력하고, 아래에서 템플릿을 고른 뒤 매트릭스로 조항
            편집을 시작하거나 템플릿 카드를 눌러 바로 열 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => setWizardOpen(false)}
            className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            ← 처음으로
          </button>
        </div>
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
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-neutral-700">장르</span>
            <select
              className="min-w-[140px] rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={selection.genre ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) selectGenre(v as any);
                else resetSelection();
              }}
            >
              <option value="">선택 안 함</option>
              <option value="예능">예능</option>
              <option value="교양">교양</option>
              <option value="드라마">드라마</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-semibold text-neutral-700">계약형태</span>
            <select
              className="min-w-[150px] rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={selection.type ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) selectType(v as any);
                else resetSelection();
              }}
            >
              <option value="">선택 안 함</option>
              <option value="2자계약">2자 계약</option>
              <option value="위수탁 계약">위수탁 계약</option>
              <option value="언진원 계약">언진원 계약</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <span className="font-semibold text-neutral-700">계약서 유형</span>
            <select
              className="min-w-[170px] rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-800 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={selection.doc ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) selectDoc(v as any);
                else resetSelection();
              }}
              disabled={!selection.genre || !selection.type}
            >
              <option value="">
                {selection.genre && selection.type
                  ? '유형 선택'
                  : '장르·형태 먼저 선택'}
              </option>
              {getAvailableDocTypes(selection.genre, selection.type).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={handleStartMatrixEditor}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
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
              <polyline points="9 18 15 12 9 6" />
            </svg>
            조항 편집 시작
          </button>
          <span className="text-[11px] text-neutral-500">
            선택한 매트릭스(장르·형태·유형)로 표준 조항을 불러옵니다. 아래 템플릿 카드는 템플릿 관리
            항목을 바로 엽니다.
          </span>
        </div>
      </div>

      <TemplateSelector />
    </div>
  );
}
