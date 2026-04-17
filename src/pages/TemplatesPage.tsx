import { useEffect, useMemo, useState } from 'react';
import { ConfirmDialog } from '../components/templates/ConfirmDialog';
import { EditTemplateModal } from '../components/templates/EditTemplateModal';
import { NewTemplateModal } from '../components/templates/NewTemplateModal';
import {
  canAddNewManagedTemplate,
  isAdminOrManagementSupport,
} from '../lib/userManagementPolicy';
import { isSupabaseConfigured } from '../lib/supabase/client';
import { formatTemplateMetaFromItem } from '../lib/templateListOps';
import { useAppStore } from '../store/useAppStore';
import {
  hydrateManagedTemplateList,
  useTemplateListStore,
} from '../store/useTemplateListStore';
import type { TemplateListItem, TemplateTone } from '../types/managedTemplate';

export function TemplatesPage() {
  const showToast = useAppStore((s) => s.showToast);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  const openEditorFromManagedItem = useAppStore((s) => s.openEditorFromManagedItem);
  const items = useTemplateListStore((s) => s.items);
  const addItem = useTemplateListStore((s) => s.addItem);
  const updateItem = useTemplateListStore((s) => s.updateItem);
  const discardItem = useTemplateListStore((s) => s.discardItem);
  const removeItem = useTemplateListStore((s) => s.removeItem);

  const [tab, setTab] = useState<'active' | 'discarded'>('active');
  const [newOpen, setNewOpen] = useState(false);
  const [editItem, setEditItem] = useState<TemplateListItem | null>(null);
  const [confirm, setConfirm] = useState<
    | null
    | { mode: 'discard' | 'remove'; id: string; name: string }
  >(null);

  useEffect(() => {
    void hydrateManagedTemplateList();
  }, []);

  const cloudEnabled = isSupabaseConfigured();

  const canMutateTemplates = useMemo(
    () =>
      cloudEnabled &&
      isAdminOrManagementSupport({
        employeeId: authEmployeeId,
        department: currentUserDepartment,
      }),
    [authEmployeeId, currentUserDepartment, cloudEnabled],
  );

  const canAddNewTemplate = useMemo(
    () =>
      cloudEnabled && canAddNewManagedTemplate(authEmployeeId, currentUserDepartment),
    [authEmployeeId, currentUserDepartment, cloudEnabled],
  );

  const activeList = useMemo(
    () => items.filter((i) => i.status === 'active'),
    [items],
  );
  const discardedList = useMemo(
    () => items.filter((i) => i.status === 'discarded'),
    [items],
  );

  const visible = tab === 'active' ? activeList : discardedList;

  const handleCreate = (payload: Omit<TemplateListItem, 'id' | 'status'>) => {
    if (!cloudEnabled) {
      showToast(
        '템플릿 공유/관리는 Supabase 연동(배포 환경 변수 설정) 후에만 사용할 수 있습니다.',
        'warning',
      );
      return;
    }
    if (!canAddNewTemplate) {
      showToast(
        '새 템플릿 추가는 사번 admin 또는 경영지원팀 소속 계정만 할 수 있습니다.',
        'warning',
      );
      return;
    }
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? `tpl-${crypto.randomUUID()}`
        : `tpl-${Date.now()}`;
    const created: TemplateListItem = {
      ...payload,
      id,
      status: 'active',
    };
    addItem(created);
    setTab('active');
    showToast(
      `'${payload.name}' 템플릿을 저장했습니다. 편집기에서 내용을 수정할 수 있습니다.`,
      'success',
    );
    if (payload.attachment && !payload.attachment.textContent) {
      showToast(
        '이 파일 형식은 브라우저에서 본문을 읽지 못했습니다. .txt·.md·.html·.docx는 조항 초안을 채울 수 있습니다.',
        'info',
      );
    }
    openEditorFromManagedItem(created);
  };

  const runConfirm = () => {
    if (!confirm || !canMutateTemplates) return;
    if (confirm.mode === 'discard') {
      discardItem(confirm.id);
      showToast(`'${confirm.name}' 템플릿을 폐기했습니다`, 'warning');
    } else {
      removeItem(confirm.id);
      showToast(`'${confirm.name}' 템플릿을 삭제했습니다`, 'success');
    }
    setConfirm(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>홈</span>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">템플릿 관리</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 pb-4">
          <h1 className="text-xl font-bold text-neutral-900">템플릿 관리</h1>
          {!canMutateTemplates ? (
            <p className="max-w-xl text-xs text-neutral-500">
              조회만 가능합니다. 템플릿 수정·폐기는 경영지원팀 소속 또는 사번 admin 만 할
              수 있습니다.
            </p>
          ) : !canAddNewTemplate ? (
            <p className="max-w-xl text-xs text-neutral-500">
              새 템플릿 추가는 사용자 관리에 등록된 계정 중 사번 admin 또는 경영지원팀
              소속만 할 수 있습니다.
            </p>
          ) : null}
          <div className="ml-auto">
            {canAddNewTemplate ? (
              <button
                type="button"
                onClick={() => setNewOpen(true)}
                className="inline-flex items-center gap-1 rounded-md bg-primary-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                새 템플릿
              </button>
            ) : null}
          </div>
        </div>
        {isSupabaseConfigured() ? (
          <p className="mb-3 rounded-md border border-info-200 bg-info-50 px-3 py-2 text-[12px] text-info-900">
            Supabase에 연동된 목록입니다. 관리자·경영지원팀이 저장한 템플릿은 로그인한
            모든 사용자에게 동일하게 표시됩니다.
          </p>
        ) : (
          <p className="mb-3 rounded-md border border-warning-200 bg-warning-50 px-3 py-2 text-[12px] text-warning-900">
            현재 Supabase 연동이 꺼져 있어 템플릿 목록을 불러오지 않습니다. (로컬 저장은
            사용하지 않습니다.)
          </p>
        )}
        <div className="-mx-7 flex gap-0 border-t border-neutral-200 px-7">
          <button
            type="button"
            onClick={() => setTab('active')}
            className={`mb-[-1px] border-b-2 px-4 py-2.5 text-[13px] font-medium ${
              tab === 'active'
                ? 'border-primary-800 font-semibold text-primary-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            활성 템플릿 ({activeList.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('discarded')}
            className={`mb-[-1px] border-b-2 px-4 py-2.5 text-[13px] font-medium ${
              tab === 'discarded'
                ? 'border-primary-800 font-semibold text-primary-800'
                : 'border-transparent text-neutral-500 hover:text-neutral-900'
            }`}
          >
            폐기됨 ({discardedList.length})
          </button>
        </div>
      </div>

      <div className="flex-1 px-7 py-6">
        {visible.length === 0 ? (
          <div className="rounded-[10px] border border-dashed border-neutral-300 bg-neutral-50 px-6 py-16 text-center text-sm text-neutral-500">
            {tab === 'active'
              ? canAddNewTemplate
                ? '활성 템플릿이 없습니다. 새 템플릿을 추가해 보세요.'
                : '활성 템플릿이 없습니다.'
              : '폐기된 템플릿이 없습니다.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 desktop:grid-cols-3">
            {visible.map((c) => (
              <TemplateCard
                key={c.id}
                item={c}
                tab={tab}
                canMutate={canMutateTemplates}
                onEditClick={
                  canMutateTemplates && tab === 'active'
                    ? () => {
                        const latest = useTemplateListStore
                          .getState()
                          .items.find((i) => i.id === c.id);
                        if (latest) setEditItem(latest);
                      }
                    : undefined
                }
                onDeleteClick={
                  canMutateTemplates
                    ? () =>
                        setConfirm(
                          tab === 'active'
                            ? { mode: 'discard', id: c.id, name: c.name }
                            : { mode: 'remove', id: c.id, name: c.name },
                        )
                    : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      <NewTemplateModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreate={handleCreate}
      />

      <EditTemplateModal
        open={editItem !== null}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSave={(id, patch) => {
          if (!canMutateTemplates) return;
          updateItem(id, patch);
          showToast('템플릿 정보가 저장되었습니다', 'success');
          if (patch.attachment && !patch.attachment.textContent) {
            showToast(
              '새 파일은 브라우저에서 본문을 읽지 못했습니다. 텍스트 파일이면 조항이 갱신됩니다.',
              'info',
            );
          }
        }}
        onOpenInEditor={(id) => {
          if (!canMutateTemplates) return;
          const latest = useTemplateListStore.getState().items.find((i) => i.id === id);
          setEditItem(null);
          if (latest) openEditorFromManagedItem(latest);
        }}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm?.mode === 'discard' ? '템플릿 폐기' : '템플릿 완전 삭제'
        }
        message={
          confirm?.mode === 'discard' ? (
            <>
              <strong className="text-neutral-900">{confirm.name}</strong>을(를){' '}
              폐기할까요? 폐기 후에는 &apos;폐기됨&apos; 탭에서만 볼 수 있습니다.
            </>
          ) : (
            <>
              <strong className="text-neutral-900">{confirm?.name}</strong>을(를) 목록에서
              완전히 삭제할까요? 이 작업은 되돌릴 수 없습니다.
            </>
          )
        }
        confirmLabel={confirm?.mode === 'discard' ? '폐기' : '삭제'}
        tone={confirm?.mode === 'discard' ? 'warning' : 'danger'}
        onConfirm={runConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function TemplateCard({
  item: c,
  tab,
  canMutate,
  onEditClick,
  onDeleteClick,
}: {
  item: TemplateListItem;
  tab: 'active' | 'discarded';
  canMutate: boolean;
  onEditClick?: () => void;
  onDeleteClick?: () => void;
}) {
  const meta = formatTemplateMetaFromItem(c);
  const isDiscarded = c.status === 'discarded';

  return (
    <div
      className={`relative rounded-[10px] border border-neutral-200 p-[18px] transition-all hover:border-primary-300 hover:shadow-md ${
        isDiscarded ? 'bg-neutral-50 opacity-[0.55]' : 'bg-white'
      }`}
    >
      {canMutate ? (
        <div className="absolute right-3 top-3 flex gap-1">
          {onEditClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditClick();
              }}
              className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-800"
              title="템플릿 정보 수정"
              aria-label="템플릿 정보 수정"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          ) : null}
          {onDeleteClick ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteClick();
              }}
              className="rounded-md border border-neutral-200 bg-white p-1.5 text-neutral-500 hover:border-danger-300 hover:bg-danger-50 hover:text-danger-700"
              title={tab === 'active' ? '폐기' : '삭제'}
              aria-label={tab === 'active' ? '템플릿 폐기' : '템플릿 삭제'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${
          c.tone === 'primary'
            ? 'bg-primary-50'
            : c.tone === 'info'
              ? 'bg-info-100'
              : c.tone === 'success'
                ? 'bg-success-100'
                : c.tone === 'warning'
                  ? 'bg-warning-100'
                  : 'bg-neutral-100'
        }`}
      >
        <DocIcon stroke={iconStroke(c.tone)} />
      </div>
      <div
        className={`text-[13px] font-semibold text-neutral-900 ${canMutate ? 'pr-[4.5rem]' : ''}`}
      >
        {c.name}
      </div>
      <div className="mb-2.5 mt-1 text-[11px] text-neutral-400">{meta}</div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] text-neutral-400">{c.ver}</span>
        {isDiscarded ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-danger-100 px-2 py-0.5 text-[10px] font-semibold text-danger-700">
            <span className="h-[5px] w-[5px] rounded-full bg-danger-700" />
            폐기됨
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-semibold text-success-700">
            <span className="h-[5px] w-[5px] rounded-full bg-success-700" />
            활성
          </span>
        )}
      </div>
    </div>
  );
}

function iconStroke(tone: TemplateTone) {
  switch (tone) {
    case 'primary':
      return '#1E40AF';
    case 'info':
      return '#0369A1';
    case 'success':
      return '#15803D';
    case 'warning':
      return '#B45309';
    default:
      return '#94A3B8';
  }
}

function DocIcon({ stroke }: { stroke: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}
