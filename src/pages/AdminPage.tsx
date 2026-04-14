import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { User } from '../types/contract';
import { ConfirmDialog } from '../components/templates/ConfirmDialog';
import { UserUpsertModal } from '../components/admin/UserUpsertModal';
import {
  addUser,
  deleteUser,
  DuplicateEmailError,
  DuplicateEmployeeIdError,
  filterUsers,
  NotFoundError,
  toggleActive,
  updateUser,
  type UserFilterTab,
} from '../lib/userAdminOps';
import { avatarGlyph } from '../lib/avatarGlyph';
import { RESERVED_SYSTEM_EMPLOYEE_ID } from '../lib/userAdminDefaults';
import {
  loadUsersFromLocalStorage,
  loadUsersFromPersistence,
  saveUsersToPersistence,
} from '../lib/userAdminPersist';

export function AdminPage() {
  const showToast = useAppStore((s) => s.showToast);
  const syncCurrentUserDepartmentFromProfile = useAppStore(
    (s) => s.syncCurrentUserDepartmentFromProfile,
  );
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);

  const [users, setUsers] = useState<User[]>([]);
  const [usersHydrated, setUsersHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await loadUsersFromPersistence();
        if (!cancelled) setUsers(list);
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          showToast('사용자 목록을 불러오지 못했습니다', 'warning');
          setUsers(loadUsersFromLocalStorage());
        }
      } finally {
        if (!cancelled) setUsersHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showToast]);

  useEffect(() => {
    if (!usersHydrated) return;
    void saveUsersToPersistence(users).catch((e) => {
      console.error(e);
      showToast('사용자 저장에 실패했습니다', 'warning');
    });
  }, [users, usersHydrated, showToast]);
  const [tab, setTab] = useState<UserFilterTab>('all');
  const [query, setQuery] = useState('');

  const [upsertOpen, setUpsertOpen] = useState(false);
  const [upsertMode, setUpsertMode] = useState<'create' | 'edit'>('create');
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredUsers = useMemo(
    () =>
      filterUsers({
        users,
        query,
        tab,
      }),
    [users, query, tab],
  );

  const counts = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    return { total, active, inactive: total - active };
  }, [users]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-neutral-200 bg-white px-7 pb-0 pt-5">
        <div className="mb-3 flex items-center gap-1.5 text-xs text-neutral-400">
          <span>어드민</span>
          <span className="text-neutral-300">›</span>
          <span className="text-neutral-700">사용자 관리</span>
        </div>
        <div className="flex items-center gap-3 pb-4">
          <h1 className="text-xl font-bold text-neutral-900">사용자 관리</h1>
          <div className="ml-auto">
            <button
              type="button"
              disabled={!usersHydrated}
              onClick={() => {
                setUpsertMode('create');
                setEditingUser(null);
                setUpsertOpen(true);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-primary-800 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              사용자 추가
            </button>
          </div>
        </div>
        <div className="-mx-7 flex gap-0 border-t border-neutral-200 px-7">
          {[
            { t: '전체', n: counts.total, id: 'all' as const },
            { t: '활성', n: counts.active, id: 'active' as const },
            { t: '비활성', n: counts.inactive, id: 'inactive' as const },
          ].map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setTab(x.id)}
              className={`mb-[-1px] border-b-2 px-4 py-2.5 text-[13px] font-medium ${
                i === 0 && tab === 'all'
                  ? 'border-primary-800 font-semibold text-primary-800'
                  : tab === x.id
                  ? 'border-primary-800 font-semibold text-primary-800'
                  : 'border-transparent text-neutral-500 hover:text-neutral-900'
              }`}
            >
              {x.t} ({x.n})
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 px-7 py-6">
        <div className="overflow-hidden rounded-[10px] border border-neutral-200 bg-white">
          <div className="flex gap-2.5 border-b border-neutral-200 px-4 py-3">
            <div className="flex flex-1 items-center gap-2 rounded-md border border-neutral-300 bg-white px-3 py-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" aria-hidden>
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none"
                placeholder="이름·이메일·사번 검색..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                {['사용자', '사번', '이메일', '부서', '상태', ''].map((h) => (
                  <th
                    key={h || 'x'}
                    className="border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-neutral-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!usersHydrated ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-neutral-100 px-4 py-12 text-center text-[13px] text-neutral-500"
                  >
                    사용자 목록을 불러오는 중…
                  </td>
                </tr>
              ) : null}
              {usersHydrated && filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-neutral-100 px-4 py-12 text-center text-[13px] text-neutral-500"
                  >
                    등록된 사용자가 없습니다. 상단의 사용자 추가로 등록하세요.
                  </td>
                </tr>
              ) : null}
              {usersHydrated
                ? filteredUsers.map((u) => (
                <tr
                  key={u.id}
                  className={`hover:bg-neutral-50 ${u.isActive ? '' : 'opacity-60'}`}
                >
                  <td className="border-b border-neutral-100 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`flex h-[26px] w-[26px] items-center justify-center rounded-md text-sm font-bold leading-none text-white ${
                          u.isActive ? 'bg-primary-800' : 'bg-neutral-400'
                        }`}
                      >
                        {avatarGlyph(u.name)}
                      </div>
                      <div>
                        <div
                          className={`text-[13px] font-medium ${
                            u.isActive ? 'text-neutral-900' : 'text-neutral-700'
                          }`}
                        >
                          {u.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="border-b border-neutral-100 px-4 py-3 font-mono text-[12px] text-neutral-700">
                    {u.employeeId}
                  </td>
                  <td className="border-b border-neutral-100 px-4 py-3 text-neutral-500">{u.email}</td>
                  <td className="border-b border-neutral-100 px-4 py-3 text-[13px] text-neutral-600">
                    {u.department}
                  </td>
                  <td className="border-b border-neutral-100 px-4 py-3">
                    {u.isActive ? (
                      <span className="inline-flex items-center gap-1 text-[11px]">
                        <span className="h-1.5 w-1.5 rounded-full bg-success-700" />
                        활성
                      </span>
                    ) : (
                      <span className="text-[11px] text-neutral-400">⚫ 비활성</span>
                    )}
                  </td>
                  <td className="border-b border-neutral-100 px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setUsers((prev) => toggleActive(prev, u.id))}
                        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                      >
                        {u.isActive ? '관리' : '복원'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUpsertMode('edit');
                          setEditingUser(u);
                          setUpsertOpen(true);
                        }}
                        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                        aria-label="수정"
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (u.employeeId === RESERVED_SYSTEM_EMPLOYEE_ID) {
                            showToast(
                              '사번 admin 계정은 삭제할 수 없습니다',
                              'warning',
                            );
                            return;
                          }
                          setDeleteId(u.id);
                        }}
                        className="rounded-md border border-danger-300 bg-white px-2 py-1 text-xs text-danger-700 hover:bg-danger-50"
                        aria-label="삭제"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>

      <UserUpsertModal
        open={upsertOpen}
        mode={upsertMode}
        initial={editingUser}
        onClose={() => setUpsertOpen(false)}
        onSubmit={(payload) => {
          try {
            if (upsertMode === 'create') {
              const newPassword = payload.loginPassword?.trim();
              if (!newPassword) {
                showToast('로그인 비밀번호를 입력하세요', 'warning');
                return false;
              }
              setUsers((prev) =>
                addUser(prev, {
                  name: payload.name,
                  email: payload.email,
                  department: payload.department,
                  isActive: payload.isActive,
                  employeeId: payload.employeeId,
                  loginPassword: newPassword,
                }),
              );
              showToast('사용자가 추가되었습니다', 'success');
            } else {
              if (!editingUser) return false;
              const patch = {
                name: payload.name,
                email: payload.email,
                department: payload.department,
                isActive: payload.isActive,
                employeeId: payload.employeeId,
                ...(payload.loginPassword?.trim()
                  ? { loginPassword: payload.loginPassword.trim() }
                  : {}),
              };
              setUsers((prev) => {
                const next = updateUser(prev, editingUser.id, patch);
                if (
                  authEmployeeId &&
                  editingUser.employeeId.trim() === authEmployeeId.trim()
                ) {
                  queueMicrotask(() => {
                    void syncCurrentUserDepartmentFromProfile(next);
                  });
                }
                return next;
              });
              showToast('사용자 정보가 저장되었습니다', 'success');
            }
            return true;
          } catch (e) {
            if (e instanceof DuplicateEmployeeIdError) {
              showToast('이미 사용 중인 사번입니다', 'warning');
              return false;
            }
            if (e instanceof DuplicateEmailError) {
              showToast('이미 존재하는 이메일입니다', 'warning');
              return false;
            }
            if (e instanceof NotFoundError) {
              showToast('대상을 찾지 못했습니다. 새로고침 후 다시 시도하세요.', 'warning');
              return false;
            }
            console.error(e);
            showToast('저장에 실패했습니다', 'warning');
            return false;
          }
        }}
      />

      <ConfirmDialog
        open={deleteId != null}
        title="사용자 삭제"
        message={
          <span className="text-sm text-neutral-600">
            선택한 사용자를 목록에서 제거할까요?
          </span>
        }
        confirmLabel="삭제"
        tone="danger"
        onConfirm={() => {
          if (!deleteId) return;
          setUsers((prev) => deleteUser(prev, deleteId));
          setDeleteId(null);
          showToast('사용자가 삭제되었습니다', 'success');
        }}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
