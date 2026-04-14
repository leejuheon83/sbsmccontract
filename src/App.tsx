import { useEffect, useLayoutEffect, useMemo } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ToastStack } from './components/ToastStack';
import { AdminPage } from './pages/AdminPage';
import { ContractsPage } from './pages/ContractsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { LoginPage } from './pages/LoginPage';
import { ReviewPage } from './pages/ReviewPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { canAccessUserManagement } from './lib/userManagementPolicy';
import { useAppStore } from './store/useAppStore';
import { hydrateManagedTemplateList } from './store/useTemplateListStore';

export default function App() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const page = useAppStore((s) => s.page);
  const setPage = useAppStore((s) => s.setPage);
  const showToast = useAppStore((s) => s.showToast);
  const authEmployeeId = useAppStore((s) => s.authEmployeeId);
  const currentUserDepartment = useAppStore((s) => s.currentUserDepartment);
  const editorMode = useAppStore((s) => s.editorMode);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const reviewDetailOpen =
    page === 'review' && editorMode === 'review' && activeTemplate != null;

  const userManagementAllowed = useMemo(
    () =>
      canAccessUserManagement({
        employeeId: authEmployeeId,
        department: currentUserDepartment,
      }),
    [authEmployeeId, currentUserDepartment],
  );

  useEffect(() => {
    void hydrateManagedTemplateList();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void useAppStore.getState().syncCurrentUserDepartmentFromProfile();
    }
  }, [isAuthenticated]);

  useLayoutEffect(() => {
    if (!isAuthenticated || page !== 'admin' || userManagementAllowed) return;
    setPage('dashboard');
    showToast(
      '사용자 관리는 경영지원팀 소속 또는 사번 admin만 이용할 수 있습니다.',
      'warning',
    );
  }, [
    isAuthenticated,
    page,
    userManagementAllowed,
    setPage,
    showToast,
  ]);

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <ToastStack />
      </>
    );
  }

  return (
    <>
      <AppShell>
        <div
          className={
            page === 'editor' || reviewDetailOpen
              ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
              : 'flex min-h-0 flex-1 flex-col'
          }
        >
          {page === 'dashboard' ? <DashboardPage /> : null}
          {page === 'contracts' ? <ContractsPage /> : null}
          {page === 'editor' ? <EditorPage /> : null}
          {page === 'review' ? <ReviewPage /> : null}
          {page === 'templates' ? <TemplatesPage /> : null}
          {page === 'admin' && userManagementAllowed ? <AdminPage /> : null}
        </div>
      </AppShell>
      <ToastStack />
    </>
  );
}
