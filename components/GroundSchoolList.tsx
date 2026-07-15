"use client";

export type GroundSchoolItem = {
  id: number;
  title: string;
  startsAt: string;
  endsAt: string;
  location: string;
  notes: string;
  instructorName?: string;
};

const DAY_START = 6;
const DAY_END = 19; // 06:00–19:00 window, matching BookingCalendar

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

export default function GroundSchoolList({
  view,
  anchorDate,
  sessions,
  onNavigate,
  onViewChange,
  onSessionClick,
  onSlotClick,
  onDaySelect,
  showInstructor,
}: {
  view: "day" | "week";
  anchorDate: Date;
  sessions: GroundSchoolItem[];
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onViewChange: (view: "day" | "week") => void;
  onSessionClick?: (session: GroundSchoolItem) => void;
  /** Fired when an empty 1-hour cell is clicked in day view, to pre-fill a new session. */
  onSlotClick?: (startsAt: Date, endsAt: Date) => void;
  /** Fired when a day header/cell is clicked in week view, to jump into day view for that date. */
  onDaySelect?: (date: Date) => void;
  showInstructor?: boolean;
}) {
  const days =
    view === "day"
      ? [anchorDate]
      : Array.from({ length: 7 }, (_, i) => {
          const d = startOfWeek(anchorDate);
          d.setDate(d.getDate() + i);
          return d;
        });

  const hourMarks = Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i);
  const slotHours = hourMarks.slice(0, -1);
  const span = DAY_END - DAY_START;

  return (
    <div className="rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate("prev")}
            className="rounded border border-line px-2.5 py-1.5 text-sm font-semibold text-ink hover:bg-navy-50"
            aria-label="Previous"
          >
            ←
          </button>
          <button
            type="button"
            onClick={() => onNavigate("today")}
            className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-ink hover:bg-navy-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onNavigate("next")}
            className="rounded border border-line px-2.5 py-1.5 text-sm font-semibold text-ink hover:bg-navy-50"
            aria-label="Next"
          >
            →
          </button>
          <span className="ml-2 text-sm font-semibold text-navy-900">
            {view === "day"
              ? anchorDate.toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long" })
              : `${days[0].toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} – ${days[6].toLocaleDateString("en-ZA", { day: "numeric", month: "short" })}`}
          </span>
        </div>
        <div className="flex rounded border border-line p-0.5">
          {(["day", "week"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={`rounded px-3 py-1 text-xs font-semibold capitalize transition-colors ${
                view === v ? "bg-navy-900 text-white" : "text-ink-soft hover:text-navy-900"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {view === "day" && (
        <div className="overflow-x-auto border-b border-line">
          <div className="min-w-[720px]">
            <div className="flex border-b border-line pl-3 text-[10px] text-ink-soft">
              {hourMarks.map((h) => (
                <div key={h} className="flex-1 border-l border-line/60 py-1 pl-1">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            <div className="relative px-3 py-2" style={{ height: 48 }}>
              {onSlotClick &&
                slotHours.map((h) => {
                  const left = ((h - DAY_START) / span) * 100;
                  const width = (1 / span) * 100;
                  const slotStart = new Date(anchorDate);
                  slotStart.setHours(h, 0, 0, 0);
                  const slotEnd = new Date(slotStart);
                  slotEnd.setHours(h + 1);
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => onSlotClick(slotStart, slotEnd)}
                      title={`New session ${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`}
                      aria-label={`New session ${String(h).padStart(2, "0")}:00 to ${String(h + 1).padStart(2, "0")}:00`}
                      className="absolute top-0 h-full border-r border-line/40 last:border-r-0 transition-colors hover:bg-gold-500/15"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    />
                  );
                })}
              {sessions
                .filter((s) => sameDay(new Date(s.startsAt), anchorDate))
                .map((s) => {
                  const sd = new Date(s.startsAt);
                  const ed = new Date(s.endsAt);
                  const startH = Math.max(DAY_START, sd.getHours() + sd.getMinutes() / 60);
                  const endH = Math.min(DAY_END, ed.getHours() + ed.getMinutes() / 60);
                  const left = ((startH - DAY_START) / span) * 100;
                  const width = Math.max(2, ((endH - startH) / span) * 100);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onSessionClick?.(s)}
                      title={`${fmtTime(s.startsAt)}–${fmtTime(s.endsAt)} · ${s.title}`}
                      className="absolute top-1 h-9 overflow-hidden rounded bg-navy-900 px-2 text-left text-[11px] font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className="block truncate">
                        {fmtTime(s.startsAt)} {s.title}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <div className={view === "day" ? "" : "grid divide-x divide-line sm:grid-cols-7"}>
        {days.map((d) => {
          const dayItems = sessions
            .filter((s) => sameDay(new Date(s.startsAt), d))
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
          return (
            <div
              key={d.toISOString()}
              onClick={() => view === "week" && onDaySelect?.(d)}
              className={`min-h-[90px] p-3 ${view === "week" && onDaySelect ? "cursor-pointer transition-colors hover:bg-gold-500/10" : ""}`}
            >
              {view === "week" && (
                <p className="mb-2 text-xs font-semibold text-ink-soft">
                  {d.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric" })}
                </p>
              )}
              {dayItems.length === 0 ? (
                <p className="text-xs text-ink-soft/70">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {dayItems.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSessionClick?.(s);
                        }}
                        className="block w-full rounded border border-navy-900/10 bg-navy-50/60 px-2.5 py-1.5 text-left text-xs hover:bg-navy-50"
                      >
                        <span className="font-semibold text-navy-900">
                          {fmtTime(s.startsAt)}–{fmtTime(s.endsAt)}
                        </span>{" "}
                        <span className="text-ink">{s.title}</span>
                        {s.location && <span className="block text-ink-soft">{s.location}</span>}
                        {showInstructor && s.instructorName && (
                          <span className="block text-ink-soft">with {s.instructorName}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {(onSlotClick || onDaySelect) && (
        <div className="border-t border-line px-5 py-2.5 text-[11px] text-ink-soft">
          {onSlotClick && view === "day" && <span>Click an empty hour above to schedule a session.</span>}
          {onDaySelect && view === "week" && <span>Click a day to pick an exact time slot.</span>}
        </div>
      )}
    </div>
  );
}
