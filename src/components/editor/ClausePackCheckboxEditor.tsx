import { sanitizeClauseHtml } from '../../lib/richClauseHtml';
import type { PackClauseSegment } from '../../lib/packClauseSegments';

export function ClausePackCheckboxEditor({
  segments,
  orderedPackIndices,
  onChangeOrder,
}: {
  segments: PackClauseSegment[];
  orderedPackIndices: number[];
  onChangeOrder: (next: number[]) => void;
}) {
  const packs = segments.filter(
    (s): s is Extract<PackClauseSegment, { type: 'pack' }> =>
      s.type === 'pack',
  );

  const toggle = (packIndex: number) => {
    if (orderedPackIndices.includes(packIndex)) {
      onChangeOrder(orderedPackIndices.filter((i) => i !== packIndex));
    } else {
      onChangeOrder([...orderedPackIndices, packIndex]);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {packs.map((p) => {
        const checked = orderedPackIndices.includes(p.packIndex);
        const rank = checked ? orderedPackIndices.indexOf(p.packIndex) + 1 : 0;
        return (
          <label
            key={p.packIndex}
            className={`flex cursor-pointer gap-2 rounded-md border p-2 text-left transition-colors ${
              checked
                ? 'border-primary-400 bg-primary-50'
                : 'border-neutral-200 bg-white hover:bg-neutral-50'
            }`}
          >
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-800 focus:ring-primary-500"
              checked={checked}
              onChange={() => toggle(p.packIndex)}
            />
            <div className="min-w-0 flex-1">
              {rank > 0 ? (
                <span className="mb-1 mr-1 inline-block rounded bg-primary-800 px-1.5 py-px text-[10px] font-bold text-white">
                  삽입 {rank}번
                </span>
              ) : (
                <span className="mb-1 mr-1 inline-block text-[10px] text-neutral-400">
                  미선택
                </span>
              )}
              <div
                className="clause-rich-body max-h-28 overflow-y-auto text-[12px] leading-snug text-neutral-800"
                dangerouslySetInnerHTML={{
                  __html: sanitizeClauseHtml(p.html),
                }}
              />
            </div>
          </label>
        );
      })}
    </div>
  );
}
