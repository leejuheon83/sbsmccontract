import { useRef, useState } from 'react';
import {
  buildAttachmentFromFile,
  buildClausesFromAttachment,
} from '../../lib/managedTemplateAdapter';
import type { TemplateListItem, TemplateTone } from '../../types/managedTemplate';
import { TONE_OPTIONS } from './templateFormConstants';

export function NewTemplateModal({
  open,
  onClose,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (item: Omit<TemplateListItem, 'id' | 'status'>) => void | Promise<void>;
}) {
  const [name, setName] = useState('');
  const [ver, setVer] = useState('v1.0');
  const [tone, setTone] = useState<TemplateTone>('primary');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const reset = () => {
    setName('');
    setVer('v1.0');
    setTone('primary');
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    const n = name.trim();
    if (!n || submitting) return;
    let v = ver.trim();
    if (!v.startsWith('v')) v = `v${v}`;
    setSubmitting(true);
    try {
      const attachment = file ? await buildAttachmentFromFile(file) : undefined;
      const clauses = attachment ? buildClausesFromAttachment(attachment) : undefined;
      await Promise.resolve(
        onCreate({
          name: n,
          ver: v,
          tone,
          attachment,
          clauses,
          clauseCount: clauses?.length ?? 0,
          formFieldCount: 0,
          ...(clauses?.length ? { clausesAuthoritative: true } : {}),
        }),
      );
      reset();
      onClose();
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
        aria-labelledby="new-tpl-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[10px] border border-neutral-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="new-tpl-title" className="text-lg font-bold text-neutral-900">
          새 템플릿
        </h2>
        <p className="mt-1 text-xs text-neutral-500">
          .txt·.md·.html 등은 조항 초안으로 나누고, Word(.docx)는 표를 포함한 HTML로 추출해 서식을
          최대한 유지합니다. PDF·구형 .doc은 파일 정보만 저장되며 본문 추출은 서버 연동이 필요합니다.
          표준 매트릭스{' '}
          <code className="rounded bg-neutral-100 px-1">TEMPLATES</code>와는 별도 목록입니다. 아래에서
          ③ 계약서 유형과 연결하면, 편집기에서 해당 유형을 고를 때 이 템플릿의 조항을 불러옵니다.
        </p>

        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="nt-name" className="text-xs font-medium text-neutral-700">
              템플릿명 <span className="text-danger-700">*</span>
            </label>
            <input
              id="nt-name"
              className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="예: 클라우드 서비스 표준 계약"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-neutral-700">계약서 파일</span>
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
                파일 선택
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
                    제거
                  </button>
                </span>
              ) : (
                <span className="text-xs text-neutral-400">선택된 파일 없음</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="nt-ver" className="text-xs font-medium text-neutral-700">
                버전
              </label>
              <input
                id="nt-ver"
                className="rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                value={ver}
                onChange={(e) => setVer(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="nt-tone" className="text-xs font-medium text-neutral-700">
                카드 색상
              </label>
              <select
                id="nt-tone"
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

        <div className="mt-6 flex justify-end gap-2 border-t border-neutral-100 pt-4">
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
            {submitting ? '처리 중…' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  );
}
