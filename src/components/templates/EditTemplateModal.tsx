import { useEffect, useRef, useState } from 'react';
import {
  buildAttachmentFromFile,
  buildClausesFromAttachment,
  hintBodyForNonExtractableAttachment,
} from '../../lib/managedTemplateAdapter';
import type { ContractDocType, ContractFormType, Genre } from '../../types/contract';
import type { TemplateListItem, TemplateTone } from '../../types/managedTemplate';
import { LINK_DOCS, LINK_FORMS, LINK_GENRES, TONE_OPTIONS } from './templateFormConstants';

export function EditTemplateModal({
  open,
  item,
  onClose,
  onSave,
  onOpenInEditor,
}: {
  open: boolean;
  item: TemplateListItem | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<TemplateListItem>) => void | Promise<void>;
  onOpenInEditor: (id: string) => void;
}) {
  const [name, setName] = useState('');
  const [ver, setVer] = useState('v1.0');
  const [tone, setTone] = useState<TemplateTone>('primary');
  const [linkedGenre, setLinkedGenre] = useState<'' | Genre>('');
  const [linkedFormType, setLinkedFormType] = useState<'' | ContractFormType>('');
  const [linkedDocType, setLinkedDocType] = useState<'' | ContractDocType>('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open || !item) return;
    setName(item.name);
    setVer(item.ver);
    setTone(item.tone);
    setLinkedGenre(item.linkedGenre ?? '');
    setLinkedFormType(item.linkedFormType ?? '');
    setLinkedDocType(item.linkedDocType ?? '');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    // id·open 기준만 — 같은 카드로 스토어 갱신 시 폼 입력이 지워지지 않게 함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  if (!open || !item) return null;

  const handleClose = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
    onClose();
  };

  const submit = async () => {
    const n = name.trim();
    if (!n || submitting) return;
    let v = ver.trim();
    if (!v.startsWith('v')) v = `v${v}`;
    setSubmitting(true);
    try {
      const patch: Partial<TemplateListItem> = {
        name: n,
        ver: v,
        tone,
        linkedGenre: linkedGenre || undefined,
        linkedFormType: linkedFormType || undefined,
        linkedDocType: linkedDocType || undefined,
      };
      if (file) {
        const attachment = await buildAttachmentFromFile(file);
        patch.attachment = attachment;
        patch.clausesAuthoritative = false;
        const extracted = buildClausesFromAttachment(attachment);
        if (extracted.length) {
          const clauses = extracted;
          patch.clauses = clauses;
          patch.clauseCount = clauses.length;
        } else {
          patch.clauses = [
            {
              num: '§1',
              title: '초안',
              state: 'review',
              body: hintBodyForNonExtractableAttachment(attachment.fileName),
            },
          ];
          patch.clauseCount = 1;
        }
      }
      await Promise.resolve(onSave(item.id, patch));
      handleClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-neutral-900/40 p-4"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-tpl-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] border border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="edit-tpl-title" className="text-lg font-bold text-neutral-900">
          템플릿 수정
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          이름·버전·연결·카드 색상을 바꿀 수 있습니다. 계약서 파일을 다시 올리면 첨부가 교체되며, 텍스트
          파일이면 조항 초안도 다시 나눕니다. docx는 표를 포함한 HTML로 보존해 편집할 수 있습니다.
          조항 본문을 고치려면 아래 「편집기에서 열기」를 사용하세요.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="et-name" className="text-xs font-medium text-neutral-700">
              템플릿명 <span className="text-danger-700">*</span>
            </label>
            <input
              id="et-name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-700">계약서 파일 (교체)</span>
            {item.attachment ? (
              <div className="mb-1 rounded-md bg-neutral-50 px-2.5 py-1.5 text-[11px] text-neutral-600">
                현재: {item.attachment.fileName}
                {item.attachment.textContent ? ' · 본문 로드됨' : ' · 본문 미추출'}
              </div>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.html,.htm,.csv,.json,text/plain,text/html,text/markdown,.doc,.docx,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
              >
                새 파일 선택
              </button>
              {file ? (
                <span className="text-xs text-neutral-600">
                  {file.name}{' '}
                  <span className="text-neutral-400">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    className="ml-2 text-primary-700 hover:underline"
                    onClick={() => {
                      setFile(null);
                      if (inputRef.current) inputRef.current.value = '';
                    }}
                  >
                    취소
                  </button>
                </span>
              ) : (
                <span className="text-xs text-neutral-400">변경 없음</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 tablet:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="et-link-genre" className="text-xs font-medium text-neutral-700">
                편집기 연결 · 장르 (선택)
              </label>
              <select
                id="et-link-genre"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                value={linkedGenre}
                onChange={(e) => setLinkedGenre((e.target.value || '') as '' | Genre)}
              >
                {LINK_GENRES.map((g) => (
                  <option key={g.value || '_none'} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="et-link-form" className="text-xs font-medium text-neutral-700">
                편집기 연결 · 계약형태 (선택)
              </label>
              <select
                id="et-link-form"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                value={linkedFormType}
                onChange={(e) =>
                  setLinkedFormType((e.target.value || '') as '' | ContractFormType)
                }
              >
                {LINK_FORMS.map((f) => (
                  <option key={f.value || '_none'} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="et-link-doc" className="text-xs font-medium text-neutral-700">
                편집기 연결 · 계약서 유형 (선택)
              </label>
              <select
                id="et-link-doc"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                value={linkedDocType}
                onChange={(e) =>
                  setLinkedDocType((e.target.value || '') as '' | ContractDocType)
                }
              >
                {LINK_DOCS.map((d) => (
                  <option key={d.value || '_none'} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="et-ver" className="text-xs font-medium text-neutral-700">
                버전
              </label>
              <input
                id="et-ver"
                className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                value={ver}
                onChange={(e) => setVer(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="et-tone" className="text-xs font-medium text-neutral-700">
                카드 색상
              </label>
              <select
                id="et-tone"
                className="rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-700 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                value={tone}
                onChange={(e) => setTone(e.target.value as TemplateTone)}
              >
                {TONE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-neutral-100 pt-4">
          <button
            type="button"
            onClick={() => {
              const id = item.id;
              if (inputRef.current) inputRef.current.value = '';
              setFile(null);
              onClose();
              onOpenInEditor(id);
            }}
            className="w-full rounded-md border border-primary-200 bg-primary-50 px-3 py-2 text-sm font-medium text-primary-800 hover:bg-primary-100"
          >
            조항 편집기에서 열기
          </button>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!name.trim() || submitting}
              className="rounded-md bg-primary-800 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? '저장 중…' : '저장'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
