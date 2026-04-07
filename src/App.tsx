import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { ToastStack } from './components/ToastStack';
import { AdminPage } from './pages/AdminPage';
import { ContractsPage } from './pages/ContractsPage';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { ReviewPage } from './pages/ReviewPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { useAppStore } from './store/useAppStore';
import { hydrateManagedTemplateList } from './store/useTemplateListStore';

export default function App() {
  const page = useAppStore((s) => s.page);
  const editorMode = useAppStore((s) => s.editorMode);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const reviewDetailOpen =
    page === 'review' && editorMode === 'review' && activeTemplate != null;

  useEffect(() => {
    void hydrateManagedTemplateList();
  }, []);

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
          {page === 'admin' ? <AdminPage /> : null}
        </div>
      </AppShell>
      <ToastStack />
    </>
  );
}
