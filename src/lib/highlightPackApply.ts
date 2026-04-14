import { hasPackBoxAppearance } from './richClauseHtml';
import { renumberPackOuterHtml } from './packClauseSegments';

/** 본문에서 `1. 용어` / `2)` 형태로 번호가 붙은 정의 줄인지 (플레이스홀더 `[…]` 등은 제외) */
export function isNumberedListLeadText(text: string): boolean {
  const t = text.replace(/\u00a0/g, ' ').trimStart();
  return /^\d{1,3}\s*[\.)．]\s*\S/u.test(t);
}

/** 체크박스 그룹으로 묶을 최소 연속 항목 수 (용어 정의 1~5 같은 구간만 대상) */
const MIN_NUMBERED_PACK_RUN = 2;

function isNumberedPackCandidate(node: HTMLElement): boolean {
  return (
    hasPackBoxAppearance(node) &&
    isNumberedListLeadText(node.textContent ?? '')
  );
}

/**
 * data-highlight-id 순서와 동일한 인덱스의 편집 가능 노드에서,
 * **번호로 시작하는** 연속 노란 박스만 pack run으로 묶습니다.
 * 그 외 노란 하이라이트(플레이스홀더 등)는 solo입니다.
 */
export function computeEditableHighlightPackRuns(nodes: HTMLElement[]): {
  packRuns: string[][];
  soloIds: string[];
} {
  const ids = nodes.map((_, i) => `h-${i + 1}`);
  const packRuns: string[][] = [];
  const soloIds: string[] = [];
  let i = 0;
  while (i < nodes.length) {
    if (isNumberedPackCandidate(nodes[i]!)) {
      const s = i;
      while (i < nodes.length && isNumberedPackCandidate(nodes[i]!)) {
        i++;
      }
      const slice = ids.slice(s, i);
      if (slice.length >= MIN_NUMBERED_PACK_RUN) {
        packRuns.push(slice);
      } else {
        for (const id of slice) soloIds.push(id);
      }
    } else {
      soloIds.push(ids[i]!);
      i++;
    }
  }
  return { packRuns, soloIds };
}

export type HighlightSidebarRow =
  | { type: 'pack'; runIndex: number }
  | { type: 'solo'; id: string };

/** 문서 순서(orderedIds)대로 사이드바 행을 만듭니다. pack 그룹은 첫 멤버에서 한 번만 표시. */
export function buildHighlightSidebarRows(
  orderedIds: string[],
  packRuns: string[][],
  soloIds: string[],
): HighlightSidebarRow[] {
  const rows: HighlightSidebarRow[] = [];
  const seenRun = new Set<number>();
  for (const id of orderedIds) {
    const runIndex = packRuns.findIndex((r) => r.includes(id));
    if (runIndex >= 0) {
      if (seenRun.has(runIndex)) continue;
      seenRun.add(runIndex);
      rows.push({ type: 'pack', runIndex });
    } else if (soloIds.includes(id)) {
      rows.push({ type: 'solo', id });
    }
  }
  return rows;
}

/**
 * 하이라이트 편집 DOM에서 pack run별로 체크 해제 항목을 제거하고,
 * 선택 순서대로 번호를 다시 붙입니다.
 */
export function applyEditableHighlightPackRunsToHtml(
  editorInnerHtml: string,
  packRuns: string[][],
  selections: string[][],
): string {
  if (typeof DOMParser === 'undefined') return editorInnerHtml;
  const doc = new DOMParser().parseFromString('<body></body>', 'text/html');
  const wrap = doc.createElement('div');
  wrap.innerHTML = editorInnerHtml;

  packRuns.forEach((runIds, ri) => {
    const order = selections[ri] ?? [];
    const allowed = new Set(order);
    for (const fid of runIds) {
      if (allowed.has(fid)) continue;
      wrap.querySelector(`[data-highlight-id="${fid}"]`)?.remove();
    }
    let n = 0;
    for (const fid of order) {
      if (!runIds.includes(fid)) continue;
      const el = wrap.querySelector(`[data-highlight-id="${fid}"]`);
      if (!el || !(el instanceof HTMLElement)) continue;
      n += 1;
      const renumbered = renumberPackOuterHtml(el.outerHTML, n);
      const pdoc = new DOMParser().parseFromString(
        `<body>${renumbered}</body>`,
        'text/html',
      );
      const nu = pdoc.body.firstElementChild;
      if (!nu) continue;
      const imported = doc.importNode(nu, true);
      el.parentNode?.replaceChild(imported, el);
    }
  });

  return wrap.innerHTML;
}
