/**
 * 현재 편집 중인 ClauseBlock들의 강제-저장 콜백을 보관합니다.
 * EditorWorkspace가 미리보기/Word 내보내기 직전에 flushAllActiveEditors()를 호출해
 * 아직 저장 버튼을 누르지 않은 편집 내용도 Zustand에 반영합니다.
 */

type CommitCallback = () => void;

const _registry = new Map<string, CommitCallback>();

export function registerActiveEditor(key: string, cb: CommitCallback): void {
  _registry.set(key, cb);
}

export function unregisterActiveEditor(key: string): void {
  _registry.delete(key);
}

/**
 * 현재 편집 중인 모든 ClauseBlock의 변경사항을 Zustand에 강제 반영합니다.
 * dispatchEvent('co-force-finish-edit') 보다 안정적입니다:
 *  - 클로저 캡처 시점에 관계없이 항상 최신 commitEdit ref를 호출
 *  - 동기 실행 보장
 */
export function flushAllActiveEditors(): void {
  for (const [key, cb] of _registry) {
    try {
      cb();
    } catch (e) {
      console.error('[flushAllActiveEditors] error for', key, e);
    }
  }
}
