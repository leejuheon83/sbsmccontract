import { create } from 'zustand';
import { TEMPLATES } from '../data/templates';
import { bumpTemplateVersion } from '../lib/bumpTemplateVersion';
import {
  listManagedCandidatesForSelection,
  managedItemToContractTemplate,
  resolveClausesFromManagedItemWithFallbacks,
} from '../lib/managedTemplateAdapter';
import { canPerformContractReviewByDepartment } from '../lib/versionReviewPolicy';
import { MANAGEMENT_SUPPORT_DEPARTMENT } from '../lib/userDepartments';
import type {
  AuditActionType,
  AuditEntry,
  Clause,
  ContractDocType,
  ContractFormType,
  ContractTemplate,
  Genre,
  Role,
  TemplateSelection,
} from '../types/contract';
import type { StoredContractDraft } from '../lib/contractDraftTypes';
import { resolveActiveTemplateForStoredDraft } from '../lib/restoreStoredDraft';
import type { TemplateListItem } from '../types/managedTemplate';
import { useTemplateListStore } from './useTemplateListStore';

export type PageId =
  | 'dashboard'
  | 'contracts'
  | 'editor'
  | 'review'
  | 'templates'
  | 'admin';

export type EditorBottomTab = 'ai' | 'ver' | 'audit';

/** compose: 계약서 작성 · review: 검토 화면 전용(읽기 중심, AI 패널) */
export type EditorMode = 'compose' | 'review';

type Toast = { id: string; msg: string; type: 'success' | 'info' | 'warning' };

type VersionReviewMap = Record<
  string,
  'pending' | 'approved' | 'rejected'
>;

function resolveTemplate(sel: TemplateSelection): ContractTemplate | null {
  if (!sel.genre || !sel.type || !sel.doc) return null;
  return TEMPLATES[sel.genre]?.[sel.type]?.[sel.doc] ?? null;
}

let toastSeq = 0;
function nextToastId() {
  return `toast-${++toastSeq}`;
}

let auditSeq = 0;
function nextAuditId() {
  return `audit-${++auditSeq}`;
}

interface AppState {
  page: PageId;
  setPage: (p: PageId) => void;

  toasts: Toast[];
  showToast: (msg: string, type?: Toast['type']) => void;
  dismissToast: (id: string) => void;

  selection: TemplateSelection;
  selectGenre: (g: Genre) => void;
  selectType: (t: ContractFormType) => void;
  selectDoc: (d: ContractDocType) => void;
  /** Set genre + 계약형태 + 유형 in one update (flat template picker). */
  selectMatrixTemplate: (
    genre: Genre,
    formType: ContractFormType,
    docType: ContractDocType,
  ) => void;
  setMatrixClauseSourceId: (id: string | null) => void;
  resetSelection: () => void;

  /** Working title for the draft (shown in editor header). */
  contractDocumentTitle: string;
  setContractDocumentTitle: (title: string) => void;
  editorStep: 'select' | 'edit';
  activeTemplate: ContractTemplate | null;
  clauses: Clause[];
  displayVer: string;
  saveGeneration: number;
  initialClauseCount: number;
  aiPanelVisible: boolean;
  extraClauseCount: number;
  auditEntries: AuditEntry[];

  editorOrigin: 'matrix' | 'managed';
  managedTemplateId: string | null;
  managedChipLabel: string | null;
  /** 매트릭스 진입 시 템플릿 관리에서 조항만 끌어온 경우 표시용 (저장 동기화 대상 아님) */
  matrixClauseSourceName: string | null;
  /** 브라우저 IndexedDB 초안 키 (편집 세션당 1개) */
  localDraftId: string | null;

  openEditor: () => void;
  openEditorFromManagedItem: (item: TemplateListItem) => void;
  /** 새 계약 등에서 표준 위저드(템플릿 선택) 화면으로 이동 */
  showEditorTemplatePicker: () => void;
  backToSelect: () => void;
  updateClauseBody: (index: number, body: string) => void;
  /** 템플릿 관리 활성 항목의 조항으로 현재 편집 초안 교체 */
  loadDraftFromManagedTemplate: (item: TemplateListItem) => void;
  recordClauseEdit: (clauseTitle: string) => void;
  acceptAiSuggestion: () => void;
  rejectAiSuggestion: () => void;
  saveVersion: () => void;
  hideAiPanel: () => void;
  appendAudit: (action: string, type: AuditActionType) => void;

  /** 데모·RBAC용 (Topbar 표시와 맞춤) */
  currentRole: Role;
  setCurrentRole: (r: Role) => void;
  /** 로그인 사용자 부서 — 검토·승인은 경영지원팀만 */
  currentUserDepartment: string;
  setCurrentUserDepartment: (d: string) => void;
  versionReviewByVer: VersionReviewMap;
  setVersionReviewApproval: (
    ver: string,
    status: 'approved' | 'rejected',
  ) => void;
  editorBottomTab: EditorBottomTab;
  setEditorBottomTab: (t: EditorBottomTab) => void;
  editorMode: EditorMode;
  /** IndexedDB에 저장된 초안을 계약서 작성 화면으로 불러옴 */
  loadStoredDraft: (draft: StoredContractDraft) => void;
  /** 검토 목록에서 열기 — 검토 페이지 내 상세 뷰(AI·버전·감사) */
  openReviewDraft: (draft: StoredContractDraft) => void;
  /** 검토 상세 닫고 목록으로 */
  closeReviewDraft: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  page: 'dashboard',
  setPage: (page) => {
    if (page !== 'review' && get().editorMode === 'review') {
      get().closeReviewDraft();
    }
    set({ page });
  },

  toasts: [],
  showToast: (msg, type = 'info') => {
    const id = nextToastId();
    set((s) => ({ toasts: [...s.toasts, { id, msg, type }] }));
    setTimeout(() => get().dismissToast(id), 3000);
  },
  dismissToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  selection: {
    genre: null,
    type: null,
    doc: null,
    matrixClauseSourceId: null,
  },
  selectGenre: (genre) => {
    if (genre === '드라마') {
      get().showToast('드라마 계약 유형은 현재 준비 중입니다', 'warning');
    }
    set({
      selection: {
        genre,
        type: null,
        doc: null,
        matrixClauseSourceId: null,
      },
    });
  },
  selectType: (type) =>
    set((s) => ({
      selection: {
        ...s.selection,
        type,
        doc: null,
        matrixClauseSourceId: null,
      },
    })),
  selectDoc: (doc) =>
    set((s) => ({
      selection: {
        ...s.selection,
        doc,
        matrixClauseSourceId: null,
      },
    })),
  selectMatrixTemplate: (genre, formType, docType) =>
    set((s) => ({
      selection: {
        ...s.selection,
        genre,
        type: formType,
        doc: docType,
        matrixClauseSourceId: null,
      },
    })),
  setMatrixClauseSourceId: (id) =>
    set((s) => ({
      selection: { ...s.selection, matrixClauseSourceId: id },
    })),
  resetSelection: () =>
    set({
      selection: {
        genre: null,
        type: null,
        doc: null,
        matrixClauseSourceId: null,
      },
    }),

  contractDocumentTitle: '',
  setContractDocumentTitle: (contractDocumentTitle) => set({ contractDocumentTitle }),
  editorStep: 'select',
  activeTemplate: null,
  clauses: [],
  displayVer: 'v1.0',
  saveGeneration: 1,
  initialClauseCount: 0,
  aiPanelVisible: false,
  editorMode: 'compose',
  extraClauseCount: 0,
  auditEntries: [],

  currentRole: 'admin',
  setCurrentRole: (currentRole) => set({ currentRole }),
  currentUserDepartment: MANAGEMENT_SUPPORT_DEPARTMENT,
  setCurrentUserDepartment: (currentUserDepartment) =>
    set({ currentUserDepartment }),
  versionReviewByVer: {},
  setVersionReviewApproval: (ver, status) => {
    if (!canPerformContractReviewByDepartment(get().currentUserDepartment)) {
      get().showToast(
        '계약서 검토·승인은 경영지원팀 소속만 할 수 있습니다',
        'warning',
      );
      return;
    }
    const ok =
      status === 'rejected'
        ? window.confirm(`${ver} 버전을 반려 처리할까요?`)
        : window.confirm(`${ver} 버전을 승인 처리할까요?`);
    if (!ok) return;
    set((s) => ({
      versionReviewByVer: { ...s.versionReviewByVer, [ver]: status },
    }));
    const action =
      status === 'approved'
        ? `버전 ${ver} 검토 승인`
        : `버전 ${ver} 검토 반려`;
    get().appendAudit(
      action,
      status === 'approved' ? 'review_complete' : 'review_reject',
    );
    get().showToast(
      status === 'approved'
        ? `${ver}이(가) 승인 처리되었습니다`
        : `${ver}이(가) 반려 처리되었습니다`,
      status === 'approved' ? 'success' : 'warning',
    );
  },
  editorBottomTab: 'ver',
  setEditorBottomTab: (editorBottomTab) => set({ editorBottomTab }),

  editorOrigin: 'matrix',
  managedTemplateId: null,
  managedChipLabel: null,
  matrixClauseSourceName: null,
  localDraftId: null,

  appendAudit: (action, type) => {
    const entry: AuditEntry = {
      id: nextAuditId(),
      action,
      type,
      author: '이주헌',
      timestamp: new Date().toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    set((s) => ({ auditEntries: [entry, ...s.auditEntries] }));
  },

  openEditor: () => {
    const sel = get().selection;
    const tmpl = resolveTemplate(sel);
    if (!tmpl) return;
    const items = useTemplateListStore.getState().items;
    const candidates = listManagedCandidatesForSelection(sel, items);
    const allowed = new Set(candidates.map((c) => c.id));
    const chosenId = sel.matrixClauseSourceId;
    const managed =
      chosenId && allowed.has(chosenId)
        ? items.find((i) => i.id === chosenId && i.status === 'active') ?? null
        : null;
    let clauses = tmpl.clauses.map((c) => ({ ...c }));
    let matrixClauseSourceName: string | null = null;
    let auditAction = `템플릿 '${tmpl.label}' 불러오기`;
    if (managed) {
      const pulled = resolveClausesFromManagedItemWithFallbacks(managed, sel);
      if (pulled.length) {
        clauses = pulled.map((c) => ({ ...c }));
        matrixClauseSourceName = managed.name;
        auditAction = `템플릿 '${tmpl.label}' 불러오기 · 조항은 템플릿 관리「${managed.name}」적용`;
      }
    }
    get().appendAudit(auditAction, 'load');
    set({
      page: 'editor',
      editorMode: 'compose',
      editorOrigin: 'matrix',
      managedTemplateId: null,
      managedChipLabel: null,
      matrixClauseSourceName,
      localDraftId: crypto.randomUUID(),
      editorStep: 'edit',
      activeTemplate: tmpl,
      clauses,
      displayVer: tmpl.ver,
      saveGeneration: 1,
      initialClauseCount: clauses.length,
      aiPanelVisible: false,
      extraClauseCount: 0,
      versionReviewByVer: { [tmpl.ver]: 'pending' },
      editorBottomTab: 'ver',
    });
  },

  showEditorTemplatePicker: () => {
    set({
      page: 'editor',
      editorMode: 'compose',
      editorStep: 'select',
      contractDocumentTitle: '',
      activeTemplate: null,
      clauses: [],
      editorOrigin: 'matrix',
      managedTemplateId: null,
      managedChipLabel: null,
      matrixClauseSourceName: null,
      localDraftId: null,
      selection: {
        genre: null,
        type: null,
        doc: null,
        matrixClauseSourceId: null,
      },
    });
  },

  openEditorFromManagedItem: (item) => {
    const tmpl = managedItemToContractTemplate(item);
    const clauses = tmpl.clauses.map((c) => ({ ...c }));
    get().appendAudit(`관리 템플릿 '${item.name}' 불러오기`, 'load');
    set({
      page: 'editor',
      editorMode: 'compose',
      editorOrigin: 'managed',
      managedTemplateId: item.id,
      managedChipLabel: `${item.name} · 템플릿 관리`,
      matrixClauseSourceName: null,
      editorStep: 'edit',
      activeTemplate: tmpl,
      clauses,
      displayVer: item.ver,
      saveGeneration: 1,
      initialClauseCount: clauses.length,
      aiPanelVisible: false,
      extraClauseCount: 0,
      selection: {
        genre: null,
        type: null,
        doc: null,
        matrixClauseSourceId: null,
      },
      versionReviewByVer: { [item.ver]: 'pending' },
      editorBottomTab: 'ver',
    });
  },

  backToSelect: () => {
    if (get().editorOrigin === 'managed') {
      set({
        editorStep: 'select',
        activeTemplate: null,
        clauses: [],
        editorOrigin: 'matrix',
        managedTemplateId: null,
        managedChipLabel: null,
        matrixClauseSourceName: null,
        localDraftId: null,
        versionReviewByVer: {},
        editorBottomTab: 'ver',
      });
      get().setPage('templates');
      return;
    }
    set({
      editorStep: 'select',
      activeTemplate: null,
      clauses: [],
      matrixClauseSourceName: null,
      localDraftId: null,
      selection: {
        genre: null,
        type: null,
        doc: null,
        matrixClauseSourceId: null,
      },
      versionReviewByVer: {},
      editorBottomTab: 'ver',
    });
  },

  updateClauseBody: (index, body) => {
    set((s) => ({
      clauses: s.clauses.map((c, i) => (i === index ? { ...c, body } : c)),
    }));
  },

  loadDraftFromManagedTemplate: (item) => {
    if (!get().activeTemplate) return;
    const pulled = resolveClausesFromManagedItemWithFallbacks(
      item,
      get().selection,
    );
    if (!pulled.length) {
      get().showToast('불러올 조항이 없습니다', 'warning');
      return;
    }
    const { clauses } = get();
    if (
      clauses.length > 0 &&
      !window.confirm(
        '현재 편집 중인 조항이 선택한 템플릿 조항으로 교체됩니다. 계속할까요?',
      )
    ) {
      return;
    }
    get().appendAudit(
      `템플릿 관리「${item.name}」에서 조항 초안 ${pulled.length}개 적용`,
      'load',
    );
    set({
      clauses: pulled.map((c) => ({ ...c })),
      initialClauseCount: pulled.length,
      extraClauseCount: 0,
      ...(get().editorOrigin === 'matrix'
        ? { matrixClauseSourceName: item.name }
        : {}),
    });
    get().showToast(`「${item.name}」조항 ${pulled.length}개를 불러왔습니다`, 'success');
  },

  recordClauseEdit: (clauseTitle) => {
    get().appendAudit(`'${clauseTitle}' 조항 내용 수정`, 'edit');
    get().showToast('조항이 수정되었습니다. 저장 전 상태입니다.', 'info');
  },

  acceptAiSuggestion: () => {
    const { activeTemplate, clauses, initialClauseCount, extraClauseCount } =
      get();
    if (!activeTemplate) return;
    const title = activeTemplate.aiSuggest.title;
    const body = activeTemplate.aiSuggest.body;
    const nextExtra = extraClauseCount + 1;
    const newClause: Clause = {
      num: `§${initialClauseCount + nextExtra}`,
      title,
      state: 'ai',
      body,
    };
    get().appendAudit(`AI 제안 조항 '${title}' 수락`, 'ai_accept');
    set({
      clauses: [...clauses, newClause],
      aiPanelVisible: false,
      extraClauseCount: nextExtra,
    });
    get().showToast(`'${title}' 조항이 삽입되었습니다`, 'success');
  },

  rejectAiSuggestion: () => {
    get().appendAudit('AI 추천 거부', 'ai_reject');
    set({ aiPanelVisible: false });
    get().showToast('AI 추천 거부됨', 'warning');
  },

  saveVersion: () => {
    const { displayVer, activeTemplate, editorOrigin, managedTemplateId, clauses } =
      get();
    if (!activeTemplate) return;
    const newVer = bumpTemplateVersion(displayVer);
    get().appendAudit(`${newVer}으로 저장`, 'save');
    if (editorOrigin === 'managed' && managedTemplateId) {
      useTemplateListStore
        .getState()
        .syncFromEditor(managedTemplateId, clauses, newVer);
    }
    set((s) => ({
      displayVer: newVer,
      saveGeneration: s.saveGeneration + 1,
      versionReviewByVer: {
        ...s.versionReviewByVer,
        [newVer]: 'pending',
      },
    }));
    get().showToast(`${newVer}으로 저장되었습니다`, 'success');
  },

  hideAiPanel: () => set({ aiPanelVisible: false }),

  loadStoredDraft: (draft) => {
    const tmplBase = resolveActiveTemplateForStoredDraft(draft);
    const clauses = draft.clauses.map((c) => ({ ...c }));
    const managedChipLabel =
      draft.editorOrigin === 'managed' && draft.managedTemplateId
        ? (() => {
            const item = useTemplateListStore
              .getState()
              .items.find((i) => i.id === draft.managedTemplateId);
            return item
              ? `${item.name} · 템플릿 관리`
              : `${(draft.templateLabel || '관리 템플릿').trim()} · 템플릿 관리`;
          })()
        : null;

    const label = draft.contractDocumentTitle.trim() || draft.templateLabel || '초안';

    const vr =
      draft.versionReviewByVer &&
      Object.keys(draft.versionReviewByVer).length > 0
        ? { ...draft.versionReviewByVer }
        : { [draft.displayVer]: 'pending' as const };

    set({
      page: 'editor',
      editorMode: 'compose',
      editorStep: 'edit',
      localDraftId: draft.id,
      contractDocumentTitle: draft.contractDocumentTitle,
      selection: { ...draft.selection },
      activeTemplate: { ...tmplBase, clauses },
      clauses,
      displayVer: draft.displayVer,
      saveGeneration: draft.saveGeneration,
      editorOrigin: draft.editorOrigin,
      managedTemplateId: draft.managedTemplateId,
      managedChipLabel,
      matrixClauseSourceName: draft.matrixClauseSourceName,
      auditEntries: draft.auditEntries.slice(0, 100),
      initialClauseCount: clauses.length,
      extraClauseCount: 0,
      aiPanelVisible: false,
      versionReviewByVer: vr,
      editorBottomTab: 'ver',
    });
    get().appendAudit(`저장 초안 불러오기 · ${label}`, 'load');
    get().showToast('저장된 초안을 불러왔습니다', 'success');
  },

  openReviewDraft: (draft) => {
    const tmplBase = resolveActiveTemplateForStoredDraft(draft);
    const clauses = draft.clauses.map((c) => ({ ...c }));
    const managedChipLabel =
      draft.editorOrigin === 'managed' && draft.managedTemplateId
        ? (() => {
            const item = useTemplateListStore
              .getState()
              .items.find((i) => i.id === draft.managedTemplateId);
            return item
              ? `${item.name} · 템플릿 관리`
              : `${(draft.templateLabel || '관리 템플릿').trim()} · 템플릿 관리`;
          })()
        : null;

    const label = draft.contractDocumentTitle.trim() || draft.templateLabel || '초안';

    const vr =
      draft.versionReviewByVer &&
      Object.keys(draft.versionReviewByVer).length > 0
        ? { ...draft.versionReviewByVer }
        : { [draft.displayVer]: 'pending' as const };

    set({
      page: 'review',
      editorMode: 'review',
      editorStep: 'edit',
      localDraftId: draft.id,
      contractDocumentTitle: draft.contractDocumentTitle,
      selection: { ...draft.selection },
      activeTemplate: { ...tmplBase, clauses },
      clauses,
      displayVer: draft.displayVer,
      saveGeneration: draft.saveGeneration,
      editorOrigin: draft.editorOrigin,
      managedTemplateId: draft.managedTemplateId,
      managedChipLabel,
      matrixClauseSourceName: draft.matrixClauseSourceName,
      auditEntries: draft.auditEntries.slice(0, 100),
      initialClauseCount: clauses.length,
      extraClauseCount: 0,
      aiPanelVisible: true,
      versionReviewByVer: vr,
      editorBottomTab: 'ai',
    });
    get().appendAudit(`검토 화면에서 초안 열기 · ${label}`, 'load');
    get().showToast('검토용으로 불러왔습니다', 'success');
  },

  closeReviewDraft: () => {
    set({
      editorMode: 'compose',
      editorStep: 'select',
      activeTemplate: null,
      clauses: [],
      localDraftId: null,
      contractDocumentTitle: '',
      managedTemplateId: null,
      managedChipLabel: null,
      matrixClauseSourceName: null,
      selection: {
        genre: null,
        type: null,
        doc: null,
        matrixClauseSourceId: null,
      },
      auditEntries: [],
      versionReviewByVer: {},
      aiPanelVisible: false,
      editorBottomTab: 'ver',
      extraClauseCount: 0,
      initialClauseCount: 0,
    });
  },
}));

export function getAvailableDocTypes(
  genre: Genre | null,
  form: ContractFormType | null,
): ContractDocType[] {
  if (!genre || !form) return [];
  const group = TEMPLATES[genre]?.[form];
  if (!group) return [];
  return Object.keys(group) as ContractDocType[];
}
