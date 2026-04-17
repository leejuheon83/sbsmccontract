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
 * 하이라이트된 노드들의 공통 조상(DOM 기준 가장 가까운)을 찾고,
 * 각 하이라이트 노드에 대해 그 공통 조상의 직계 자손(재배치 단위)을 반환합니다.
 *
 * 예: <div><p><span hl="h-1"/></p><p><span hl="h-2"/></p></div>
 *  → parent=<div>, reorderables=[<p> of h-1, <p> of h-2]
 */
function findReorderableNodes(
  highlightedNodes: HTMLElement[],
): { parent: Element; reorderables: HTMLElement[] } | null {
  if (highlightedNodes.length === 0) return null;

  // 공통 직접 부모인 경우 (가장 단순)
  const directParent = highlightedNodes[0]!.parentElement;
  if (
    directParent &&
    highlightedNodes.every((n) => n.parentElement === directParent)
  ) {
    return { parent: directParent, reorderables: [...highlightedNodes] };
  }

  // 부모가 다른 경우: 공통 조상을 찾아 직계 자손 목록 구성
  let candidate: Element | null = highlightedNodes[0]!.parentElement;
  while (candidate) {
    if (highlightedNodes.every((n) => candidate!.contains(n))) {
      const reorderables = highlightedNodes.map((n) => {
        let cur: HTMLElement | null = n;
        while (cur && cur.parentElement !== candidate) {
          cur = cur.parentElement;
        }
        return cur;
      });
      if (reorderables.every((c): c is HTMLElement => c !== null)) {
        // 중복 체크: 두 하이라이트 노드가 같은 컨테이너를 공유하면 안전하게 재배치 불가
        const uniq = new Set(reorderables);
        if (uniq.size === reorderables.length) {
          return { parent: candidate, reorderables: reorderables as HTMLElement[] };
        }
      }
    }
    candidate = candidate.parentElement;
  }

  return null;
}

/**
 * 하이라이트 편집 DOM에서 pack run별로 체크 해제 항목을 제거하고,
 * 선택 순서대로 번호를 다시 붙이고, 위치도 재배치합니다.
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
    const runSet = new Set(runIds);
    const checkedOrderedIds = order.filter((fid) => runSet.has(fid));

    // fid → 하이라이트 노드 맵
    const nodeById = new Map<string, HTMLElement>();
    for (const fid of runIds) {
      const el = wrap.querySelector(`[data-highlight-id="${fid}"]`);
      if (el instanceof HTMLElement) nodeById.set(fid, el);
    }

    const existingFids = runIds.filter((fid) => nodeById.has(fid));
    const existingNodes = existingFids.map((fid) => nodeById.get(fid)!);
    if (existingNodes.length === 0) return;

    // 공통 조상 기반 재배치 노드 탐색
    const reorderInfo = findReorderableNodes(existingNodes);

    if (!reorderInfo) {
      // 폴백: 제자리 번호 변경 + 미체크 제거
      for (const fid of runIds) {
        if (checkedOrderedIds.includes(fid)) continue;
        wrap.querySelector(`[data-highlight-id="${fid}"]`)?.remove();
      }
      let n = 0;
      for (const fid of checkedOrderedIds) {
        const el = wrap.querySelector(`[data-highlight-id="${fid}"]`);
        if (!el || !(el instanceof HTMLElement)) continue;
        n++;
        const renumbered = renumberPackOuterHtml(el.outerHTML, n);
        const pdoc = new DOMParser().parseFromString(
          `<body>${renumbered}</body>`,
          'text/html',
        );
        const nu = pdoc.body.firstElementChild;
        if (!nu) continue;
        el.parentNode?.replaceChild(doc.importNode(nu, true), el);
      }
      return;
    }

    const { parent, reorderables } = reorderInfo;

    // fid → 재배치 단위 노드 맵
    const reorderableByFid = new Map<string, HTMLElement>();
    existingFids.forEach((fid, i) => {
      if (reorderables[i]) reorderableByFid.set(fid, reorderables[i]!);
    });

    // 마커를 첫 번째 재배치 노드 앞에 삽입
    const marker = doc.createComment('co-pack-run-anchor');
    parent.insertBefore(marker, reorderables[0]!);

    // 모든 재배치 노드를 DOM에서 제거
    for (const rn of reorderables) rn.remove();

    // 체크된 항목만 선택 순서대로 재삽입 (번호 재매김)
    let n = 0;
    for (const fid of checkedOrderedIds) {
      const rn = reorderableByFid.get(fid);
      if (!rn) continue;
      n++;
      // 내부 하이라이트 노드 번호 갱신
      const innerHl = (rn.querySelector(`[data-highlight-id="${fid}"]`) as HTMLElement | null) ?? rn;
      const renumbered = renumberPackOuterHtml(innerHl.outerHTML, n);
      const pdoc = new DOMParser().parseFromString(
        `<body>${renumbered}</body>`,
        'text/html',
      );
      const nu = pdoc.body.firstElementChild;
      if (nu) {
        if (innerHl !== rn && innerHl.parentNode) {
          innerHl.parentNode.replaceChild(doc.importNode(nu, true), innerHl);
        } else {
          // innerHl이 rn 자체인 경우 (detached) — 내용만 교체
          rn.innerHTML = (doc.importNode(nu, true) as HTMLElement).innerHTML;
        }
      }
      parent.insertBefore(rn, marker);
    }
    // 미체크 항목은 삽입하지 않으므로 제거됨
    marker.remove();
  });

  return wrap.innerHTML;
}

/**
 * 편집 중 미리보기용:
 * - 체크 순서대로 run 내부 블록 위치를 재배치 (부모가 달라도 처리)
 * - 체크된 항목만 1,2,3... 재번호
 * - 미체크 항목은 제거하지 않고 run 뒤쪽에 유지
 */
export function previewEditableHighlightPackRunsToHtml(
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
    const runSet = new Set(runIds);
    const checkedOrderedIds = order.filter((fid) => runSet.has(fid));
    const uncheckedInDocOrder = runIds.filter(
      (fid) => !checkedOrderedIds.includes(fid),
    );
    const finalOrder = [...checkedOrderedIds, ...uncheckedInDocOrder];

    const nodeById = new Map<string, HTMLElement>();
    for (const fid of runIds) {
      const el = wrap.querySelector(`[data-highlight-id="${fid}"]`);
      if (el instanceof HTMLElement) nodeById.set(fid, el);
    }

    const existingFids = runIds.filter((fid) => nodeById.has(fid));
    const existingNodes = existingFids.map((fid) => nodeById.get(fid)!);
    if (existingNodes.length === 0) return;

    // 공통 조상 기반 재배치 노드 탐색
    const reorderInfo = findReorderableNodes(existingNodes);

    if (!reorderInfo) {
      // 폴백: 제자리 번호 변경만 (미체크 유지)
      let rank = 0;
      for (const fid of checkedOrderedIds) {
        const el = wrap.querySelector(`[data-highlight-id="${fid}"]`);
        if (!el || !(el instanceof HTMLElement)) continue;
        rank++;
        const renumbered = renumberPackOuterHtml(el.outerHTML, rank);
        const pdoc = new DOMParser().parseFromString(
          `<body>${renumbered}</body>`,
          'text/html',
        );
        const nu = pdoc.body.firstElementChild;
        if (!nu) continue;
        el.parentNode?.replaceChild(doc.importNode(nu, true), el);
      }
      return;
    }

    const { parent, reorderables } = reorderInfo;

    // fid → 재배치 단위 노드 맵 (existingFids 기준 인덱스)
    const reorderableByFid = new Map<string, HTMLElement>();
    existingFids.forEach((fid, i) => {
      if (reorderables[i]) reorderableByFid.set(fid, reorderables[i]!);
    });

    // 마커를 첫 번째 재배치 노드 앞에 삽입
    const marker = doc.createComment('co-pack-preview-anchor');
    parent.insertBefore(marker, reorderables[0]!);

    // 모든 재배치 노드를 DOM에서 제거
    for (const rn of reorderables) rn.remove();

    // finalOrder 순서로 재삽입 (체크 → 재번호, 미체크 → 원본 유지)
    let rank = 0;
    for (const fid of finalOrder) {
      const rn = reorderableByFid.get(fid);
      if (!rn) continue;
      const checked = checkedOrderedIds.includes(fid);
      if (checked) {
        rank++;
        const innerHl =
          (rn.querySelector(`[data-highlight-id="${fid}"]`) as HTMLElement | null) ??
          rn;
        const renumbered = renumberPackOuterHtml(innerHl.outerHTML, rank);
        const pdoc = new DOMParser().parseFromString(
          `<body>${renumbered}</body>`,
          'text/html',
        );
        const nu = pdoc.body.firstElementChild;
        if (nu) {
          if (innerHl !== rn && innerHl.parentNode) {
            innerHl.parentNode.replaceChild(doc.importNode(nu, true), innerHl);
          } else {
            rn.innerHTML = (doc.importNode(nu, true) as HTMLElement).innerHTML;
          }
        }
      }
      parent.insertBefore(rn, marker);
    }
    marker.remove();
  });

  return wrap.innerHTML;
}

function stripLeadingPackNumber(text: string): string {
  return text
    .replace(/^\s*\d+\s*[\.)．]\s*/u, '')
    .trimStart();
}

/**
 * 우측 입력 필드 값도 체크 순서(rank) 기준으로 `1.`, `2.` ... 번호를 맞춥니다.
 * - run에 포함되지만 미체크인 항목은 기존 값을 유지합니다.
 */
export function applyPackRunRanksToFieldValues(
  fields: Array<{ id: string; value: string }>,
  runIds: string[],
  order: string[],
): Array<{ id: string; value: string }> {
  const runSet = new Set(runIds);
  const rankById = new Map<string, number>();
  let rank = 0;
  for (const fid of order) {
    if (!runSet.has(fid)) continue;
    rank += 1;
    rankById.set(fid, rank);
  }

  return fields.map((f) => {
    if (!runSet.has(f.id)) return f;
    const r = rankById.get(f.id);
    if (!r) return f;
    return {
      ...f,
      value: `${r}. ${stripLeadingPackNumber(f.value)}`,
    };
  });
}
