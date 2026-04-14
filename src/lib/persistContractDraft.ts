import { getDraft, putDraft } from './contractDraftDb';
import type { StoredContractDraft } from './contractDraftTypes';
import { buildContractDocxBlob, downloadBlob } from './exportContractDocx';
import { buildDocxPreservingOriginalFormatting } from './exportDocxWithOriginal';
import { useAppStore } from '../store/useAppStore';
import { useTemplateListStore } from '../store/useTemplateListStore';

/** Persist current editor state to IndexedDB. Creates `localDraftId` on first save. */
export async function persistCurrentDraft(): Promise<void> {
  const s = useAppStore.getState();
  if (!s.activeTemplate) return;

  let id = s.localDraftId;
  if (!id) {
    id = crypto.randomUUID();
    useAppStore.setState({ localDraftId: id });
  }

  const previous = await getDraft(id);

  const row: StoredContractDraft = {
    id,
    updatedAt: new Date().toISOString(),
    contractDocumentTitle: s.contractDocumentTitle,
    templateLabel: s.activeTemplate.label,
    displayVer: s.displayVer,
    saveGeneration: s.saveGeneration,
    clauses: s.clauses.map((c) => ({ ...c })),
    selection: { ...s.selection },
    editorOrigin: s.editorOrigin,
    managedTemplateId: s.managedTemplateId,
    matrixClauseSourceName: s.matrixClauseSourceName,
    auditEntries: s.auditEntries.slice(0, 100),
    reviewStatus: previous?.reviewStatus ?? 'pending',
    versionReviewByVer: { ...s.versionReviewByVer },
    archived: previous?.archived ?? false,
    ownerEmployeeId:
      previous?.ownerEmployeeId ?? s.authEmployeeId ?? undefined,
  };

  await putDraft(row);
}

/** Save snapshot then trigger Word download in the browser. */
export async function exportDraftAsWordFile(): Promise<void> {
  const s = useAppStore.getState();
  if (!s.activeTemplate) {
    useAppStore.getState().showToast('저장할 계약 초안이 없습니다', 'warning');
    return;
  }

  await persistCurrentDraft();

  const sourceId =
    s.editorOrigin === 'managed'
      ? s.managedTemplateId
      : s.selection.matrixClauseSourceId;
  const sourceItem = sourceId
    ? useTemplateListStore.getState().items.find((it) => it.id === sourceId) ?? null
    : null;
  const originalDocxBase64 = sourceItem?.attachment?.originalDocxBase64;

  const blob =
    originalDocxBase64 && s.clauses.some((c) => c.bodyFormat === 'html')
      ? (await buildDocxPreservingOriginalFormatting({
          originalDocxBase64,
          clauses: s.clauses,
        })) ??
        (await buildContractDocxBlob({
          documentTitle: s.contractDocumentTitle,
          templateLabel: s.activeTemplate.label,
          versionLabel: s.displayVer,
          clauses: s.clauses,
        }))
      : await buildContractDocxBlob({
          documentTitle: s.contractDocumentTitle,
          templateLabel: s.activeTemplate.label,
          versionLabel: s.displayVer,
          clauses: s.clauses,
        });

  const base =
    (s.contractDocumentTitle.trim() || s.activeTemplate.label || 'contract')
      .replace(/[<>:"/\\|?*]/g, '_')
      .slice(0, 120) || 'contract';

  downloadBlob(blob, `${base}-${s.displayVer}.docx`);
  useAppStore.getState().showToast('Word 파일을 저장했습니다', 'success');
}

/** 편집기 없이 저장된 초안 스냅샷만으로 Word 다운로드 (계약 목록 등) */
export async function exportStoredDraftAsWordFile(
  draft: StoredContractDraft,
): Promise<void> {
  const sourceId =
    draft.editorOrigin === 'managed'
      ? draft.managedTemplateId
      : draft.selection.matrixClauseSourceId;
  const sourceItem = sourceId
    ? useTemplateListStore.getState().items.find((it) => it.id === sourceId) ??
      null
    : null;
  const originalDocxBase64 = sourceItem?.attachment?.originalDocxBase64;

  const blob =
    originalDocxBase64 && draft.clauses.some((c) => c.bodyFormat === 'html')
      ? (await buildDocxPreservingOriginalFormatting({
          originalDocxBase64,
          clauses: draft.clauses,
        })) ??
        (await buildContractDocxBlob({
          documentTitle: draft.contractDocumentTitle,
          templateLabel: draft.templateLabel,
          versionLabel: draft.displayVer,
          clauses: draft.clauses,
        }))
      : await buildContractDocxBlob({
          documentTitle: draft.contractDocumentTitle,
          templateLabel: draft.templateLabel,
          versionLabel: draft.displayVer,
          clauses: draft.clauses,
        });

  const base =
    (draft.contractDocumentTitle.trim() || draft.templateLabel || 'contract')
      .replace(/[<>:"/\\|?*]/g, '_')
      .slice(0, 120) || 'contract';

  downloadBlob(blob, `${base}-${draft.displayVer}.docx`);
  useAppStore.getState().showToast('Word 파일을 저장했습니다', 'success');
}
