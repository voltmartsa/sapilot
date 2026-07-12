"use client";

/**
 * Two-thumb range slider for picking a start–end question range.
 * Values are 1-based and inclusive; start is always <= end.
 */
export default function DualRangeSlider({
  max,
  start,
  end,
  onChange,
}: {
  max: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}) {
  const safeMax = Math.max(1, max);
  const s = Math.min(Math.max(1, start), safeMax);
  const e = Math.min(Math.max(s, end), safeMax);
  const pct = (v: number) => (safeMax === 1 ? 0 : ((v - 1) / (safeMax - 1)) * 100);

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">
          Questions {s}–{e}
        </span>
        <span className="text-xs text-ink-soft">
          {e - s + 1} of {safeMax} selected
        </span>
      </div>
      <div className="dual-range relative mt-3 h-5">
        {/* track */}
        <div className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-navy-100" />
        {/* active segment */}
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gold-500"
          style={{ left: `${pct(s)}%`, right: `${100 - pct(e)}%` }}
        />
        <input
          type="range"
          min={1}
          max={safeMax}
          value={s}
          aria-label="Start from question"
          onChange={(ev) => {
            const v = Number(ev.target.value);
            onChange(Math.min(v, e), e);
          }}
        />
        <input
          type="range"
          min={1}
          max={safeMax}
          value={e}
          aria-label="End at question"
          onChange={(ev) => {
            const v = Number(ev.target.value);
            onChange(s, Math.max(v, s));
          }}
        />
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-ink-soft">
        <label className="flex items-center gap-1.5">
          From
          <input
            type="number"
            min={1}
            max={e}
            value={s}
            onChange={(ev) => {
              const v = Number(ev.target.value);
              if (Number.isInteger(v)) onChange(Math.min(Math.max(1, v), e), e);
            }}
            className="w-16 rounded border border-line bg-white px-2 py-1 text-sm text-ink"
          />
        </label>
        <label className="flex items-center gap-1.5">
          to
          <input
            type="number"
            min={s}
            max={safeMax}
            value={e}
            onChange={(ev) => {
              const v = Number(ev.target.value);
              if (Number.isInteger(v)) onChange(s, Math.min(Math.max(s, v), safeMax));
            }}
            className="w-16 rounded border border-line bg-white px-2 py-1 text-sm text-ink"
          />
        </label>
      </div>
    </div>
  );
}
