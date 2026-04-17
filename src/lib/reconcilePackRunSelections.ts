export function reconcilePackRunSelections(
  prev: string[][],
  nextRuns: string[][],
): string[][] {
  return nextRuns.map((runIds, i) => {
    const prevOrder = prev[i] ?? [];
    // 초기 상태(또는 아직 사용자가 건드리지 않은 상태)는 원본 순서로 전체 선택.
    if (prevOrder.length === 0) return [...runIds];

    const runSet = new Set(runIds);
    // 사용자가 만든 순서/선택은 유지하되, 현재 run에 없는 항목은 제거.
    const kept = prevOrder.filter((id) => runSet.has(id));

    // 새로 생긴 항목은 기본적으로 본문 포함(전체 선택 유지)하되, 순서는 뒤에 붙입니다.
    const keptSet = new Set(kept);
    const appended = runIds.filter((id) => !keptSet.has(id));
    return [...kept, ...appended];
  });
}

