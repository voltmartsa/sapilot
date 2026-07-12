"use client";

/**
 * Status donut: correct / incorrect / unanswered.
 * Colors validated for CVD separation and surface contrast; identity is never
 * color-alone — the legend carries labels and counts.
 */
const SEGMENTS = [
  { key: "correct", label: "Correct", color: "#047857" },
  { key: "wrong", label: "Incorrect", color: "#dc2626" },
  { key: "unanswered", label: "Unanswered", color: "#64748b" },
] as const;

function arcPath(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return { x0, y0, x1, y1, large };
}

export default function DonutChart({
  correct,
  wrong,
  unanswered,
  centerLabel,
  centerSub,
}: {
  correct: number;
  wrong: number;
  unanswered: number;
  centerLabel: string;
  centerSub: string;
}) {
  const values = { correct, wrong, unanswered };
  const total = correct + wrong + unanswered;
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = 84;
  const rInner = 58;
  const gapAngle = total > 0 ? (2 * Math.PI * 2) / (2 * Math.PI * rOuter) : 0; // ≈2px gap at outer radius

  const visible = SEGMENTS.filter((s) => values[s.key] > 0);
  let angle = -Math.PI / 2;
  const paths = visible.map((s) => {
    const frac = values[s.key] / total;
    const sweep = frac * 2 * Math.PI;
    const pad = visible.length > 1 ? gapAngle / 2 : 0;
    const a0 = angle + pad;
    const a1 = angle + sweep - pad;
    angle += sweep;
    if (a1 <= a0) return null;
    const outer = arcPath(cx, cy, rOuter, a0, a1);
    const inner = arcPath(cx, cy, rInner, a0, a1);
    const d =
      frac >= 0.9999
        ? // full ring: two arcs
          `M ${cx + rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 1 ${cx - rOuter} ${cy} A ${rOuter} ${rOuter} 0 1 1 ${cx + rOuter} ${cy} ` +
          `M ${cx + rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx - rInner} ${cy} A ${rInner} ${rInner} 0 1 0 ${cx + rInner} ${cy}`
        : `M ${outer.x0} ${outer.y0} A ${rOuter} ${rOuter} 0 ${outer.large} 1 ${outer.x1} ${outer.y1} ` +
          `L ${inner.x1} ${inner.y1} A ${rInner} ${rInner} 0 ${inner.large} 0 ${inner.x0} ${inner.y0} Z`;
    return { ...s, d, value: values[s.key] };
  });

  return (
    <div className="flex flex-wrap items-center justify-center gap-8">
      <div className="relative">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="img"
          aria-label={`Results: ${correct} correct, ${wrong} incorrect, ${unanswered} unanswered`}
        >
          {total === 0 && (
            <circle cx={cx} cy={cy} r={(rOuter + rInner) / 2} fill="none" stroke="#e3ddd2" strokeWidth={rOuter - rInner} />
          )}
          {paths.map(
            (p) =>
              p && (
                <path key={p.key} d={p.d} fill={p.color} fillRule="evenodd">
                  <title>{`${p.label}: ${p.value}`}</title>
                </path>
              ),
          )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-3xl font-semibold text-navy-900">
            {centerLabel}
          </span>
          <span className="mt-0.5 text-[11px] uppercase tracking-wider text-ink-soft">
            {centerSub}
          </span>
        </div>
      </div>
      <ul className="space-y-2.5">
        {SEGMENTS.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            <span className="w-24 text-ink">{s.label}</span>
            <span className="font-semibold tabular-nums text-navy-900">
              {values[s.key]}
            </span>
            <span className="text-xs tabular-nums text-ink-soft">
              {total > 0 ? Math.round((values[s.key] / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
