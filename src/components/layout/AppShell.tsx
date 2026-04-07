import type { ReactNode } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { PageNavBar } from './PageNavBar';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({ children }: { children: ReactNode }) {
  const page = useAppStore((s) => s.page);
  const editorMode = useAppStore((s) => s.editorMode);
  const activeTemplate = useAppStore((s) => s.activeTemplate);
  const reviewDetailOpen =
    page === 'review' && editorMode === 'review' && activeTemplate != null;
  const mainScroll =
    page === 'editor' || reviewDetailOpen
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden'
      : 'min-h-0 flex-1 overflow-y-auto';

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar />
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PageNavBar />
          <div className={mainScroll}>{children}</div>
        </main>
      </div>
    </div>
  );
}
