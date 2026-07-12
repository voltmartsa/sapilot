"use client";

type ChapterRow = { id: number; name: string; questionCount: number };

/**
 * Single-chapter picker styled as selectable cards — the active chapter is shown
 * by a filled highlight rather than a checkbox tick.
 */
export default function ChapterSelect({
  chapters,
  selectedId,
  onSelect,
}: {
  chapters: ChapterRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Chapter" className="space-y-2">
      {chapters.map((c) => {
        const active = c.id === selectedId;
        return (
          <button
            key={c.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(c.id)}
            className={`group flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-all ${
              active
                ? "border-navy-900 bg-navy-900 text-white shadow-md"
                : "border-line bg-white text-ink hover:-translate-y-px hover:border-navy-700 hover:shadow-sm"
            }`}
          >
            <span
              aria-hidden="true"
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                active
                  ? "border-gold-400"
                  : "border-line group-hover:border-navy-700"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full transition-colors ${
                  active ? "bg-gold-400" : "bg-transparent"
                }`}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{c.name}</span>
              <span
                className={`block text-xs ${active ? "text-navy-100/80" : "text-ink-soft"}`}
              >
                {c.questionCount} question{c.questionCount === 1 ? "" : "s"}
              </span>
            </span>
            {active && (
              <span className="shrink-0 rounded bg-gold-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
                Selected
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
