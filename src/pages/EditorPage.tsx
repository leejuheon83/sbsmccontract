import { EditorTemplateStage } from '../components/editor/EditorTemplateStage';
import { EditorWorkspace } from '../components/editor/EditorWorkspace';
import { useAppStore } from '../store/useAppStore';

export function EditorPage() {
  const editorStep = useAppStore((s) => s.editorStep);
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {editorStep === 'select' ? <EditorTemplateStage /> : <EditorWorkspace />}
    </div>
  );
}
