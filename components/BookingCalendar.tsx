"use client";

export type CalendarBooking = {
  id: number;
  aircraftId: number;
  aircraftRegistration: string;
  startsAt: string;
  endsAt: string;
  status: string;
  studentName?: string;
  instructorName?: string;
  isMine?: boolean;
};

type AircraftLite = { id: number; registration: string; type: string; status?: string };

const DAY_START = 6;
const DAY_END = 19; // 06:00–19:00 window

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // move back to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/** The [from, to) range a calendar view needs data for. */
export function getCalendarRange(view: "day" | "week", anchorDate: Date): { from: Date; to: Date } {
  if (view === "day") {
    const from = new Date(anchorDate);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);
    return { from, to };
  }
  const from = startOfWeek(anchorDate);
  const to = new Date(from);
  to.setDate(to.getDate() + 7);
  return { from, to };
}

export function navigateAnchor(view: "day" | "week", anchorDate: Date, direction: "prev" | "next" | "today"): Date {
  if (direction === "today") return new Date();
  const next = new Date(anchorDate);
  const step = view === "day" ? 1 : 7;
  next.setDate(next.getDate() + (direction === "next" ? step : -step));
  return next;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" });
}

function statusStyle(status: string, isMine?: boolean) {
  if (status === "confirmed") return isMine ? "bg-emerald-700 text-white ring-2 ring-navy-900" : "bg-emerald-600 text-white";
  if (status === "pending") return isMine ? "bg-gold-500 text-navy-950 ring-2 ring-navy-900" : "bg-gold-400 text-navy-950";
  return "bg-navy-100 text-navy-800";
}

export default function BookingCalendar({
  view,
  anchorDate,
  aircraftList,
  bookings,
  onNavigate,
  onViewChange,
  onBookingClick,
  onSlotClick,
  onDaySelect,
}: {
  view: "day" | "week";
  anchorDate: Date;
  aircraftList: AircraftLite[];
  bookings: CalendarBooking[];
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onViewChange: (view: "day" | "week") => void;
  onBookingClick?: (booking: CalendarBooking) => void;
  /** Fired when an empty 1-hour cell is clicked in day view, to pre-fill a booking request. */
  onSlotClick?: (aircraftId: number, startsAt: Date, endsAt: Date) => void;
  /** Fired when a day header is clicked in week view, to jump into day view for that date. */
  onDaySelect?: (date: Date) => void;
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

      {aircraftList.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-ink-soft">
          No aircraft have been added yet.
        </p>
      ) : view === "day" ? (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            {/* Hour ruler */}
            <div className="flex border-b border-line pl-32 text-[10px] text-ink-soft">
              {hourMarks.map((h) => (
                <div key={h} className="flex-1 border-l border-line/60 py-1 pl-1">
                  {String(h).padStart(2, "0")}:00
                </div>
              ))}
            </div>
            {aircraftList.map((ac) => {
              const dayBookings = bookings.filter(
                (b) => b.aircraftId === ac.id && sameDay(new Date(b.startsAt), anchorDate),
              );
              return (
                <div key={ac.id} className="flex items-stretch border-b border-line last:border-0">
                  <div className="w-32 shrink-0 border-r border-line px-3 py-3">
                    <p className="text-sm font-semibold text-navy-900">{ac.registration}</p>
                    <p className="text-[11px] text-ink-soft">{ac.type}</p>
                  </div>
                  <div className="relative flex-1" style={{ height: 56 }}>
                    {onSlotClick &&
                      ac.status === "available" &&
                      slotHours.map((h) => {
                        const span = DAY_END - DAY_START;
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
                            onClick={() => onSlotClick(ac.id, slotStart, slotEnd)}
                            title={`Book ${ac.registration} ${String(h).padStart(2, "0")}:00–${String(h + 1).padStart(2, "0")}:00`}
                            aria-label={`Book ${ac.registration} ${String(h).padStart(2, "0")}:00 to ${String(h + 1).padStart(2, "0")}:00`}
                            className="absolute top-0 h-full border-r border-line/40 last:border-r-0 transition-colors hover:bg-gold-500/15"
                            style={{ left: `${left}%`, width: `${width}%` }}
                          />
                        );
                      })}
                    {dayBookings.map((b) => {
                      const s = new Date(b.startsAt);
                      const e = new Date(b.endsAt);
                      const startH = Math.max(DAY_START, s.getHours() + s.getMinutes() / 60);
                      const endH = Math.min(DAY_END, e.getHours() + e.getMinutes() / 60);
                      const span = DAY_END - DAY_START;
                      const left = ((startH - DAY_START) / span) * 100;
                      const width = Math.max(2, ((endH - startH) / span) * 100);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => onBookingClick?.(b)}
                          title={`${fmtTime(b.startsAt)}–${fmtTime(b.endsAt)} · ${b.studentName ?? ""}`}
                          className={`absolute top-2 h-9 overflow-hidden rounded px-2 text-left text-[11px] font-semibold shadow-sm transition-opacity hover:opacity-90 ${statusStyle(b.status, b.isMine)}`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                        >
                          <span className="block truncate">
                            {fmtTime(b.startsAt)} {b.studentName ?? ""}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[840px] grid-cols-[8rem_repeat(7,1fr)]">
            <div className="border-b border-r border-line" />
            {days.map((d) =>
              onDaySelect ? (
                <button
                  key={d.toISOString()}
                  type="button"
                  onClick={() => onDaySelect(d)}
                  title="Open day view to pick a time slot"
                  className="border-b border-line px-2 py-2 text-center text-xs font-semibold text-ink transition-colors hover:bg-gold-500/15 hover:text-navy-900"
                >
                  {d.toLocaleDateString("en-ZA", { weekday: "short" })}
                  <span className="ml-1 text-ink-soft">{d.getDate()}</span>
                </button>
              ) : (
                <div key={d.toISOString()} className="border-b border-line px-2 py-2 text-center text-xs font-semibold text-ink">
                  {d.toLocaleDateString("en-ZA", { weekday: "short" })}
                  <span className="ml-1 text-ink-soft">{d.getDate()}</span>
                </div>
              ),
            )}
            {aircraftList.map((ac) => (
              <div key={ac.id} className="contents">
                <div className="border-b border-r border-line px-3 py-3">
                  <p className="text-sm font-semibold text-navy-900">{ac.registration}</p>
                  <p className="text-[11px] text-ink-soft">{ac.type}</p>
                </div>
                {days.map((d) => {
                  const cellBookings = bookings.filter(
                    (b) => b.aircraftId === ac.id && sameDay(new Date(b.startsAt), d),
                  );
                  return (
                    <div
                      key={d.toISOString()}
                      onClick={() => onDaySelect?.(d)}
                      className={`min-h-[64px] space-y-1 border-b border-l border-line p-1.5 ${onDaySelect ? "cursor-pointer transition-colors hover:bg-gold-500/10" : ""}`}
                    >
                      {cellBookings.map((b) => (
                        <button
                          key={b.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBookingClick?.(b);
                          }}
                          className={`block w-full truncate rounded px-1.5 py-1 text-left text-[10px] font-semibold ${statusStyle(b.status, b.isMine)}`}
                          title={`${fmtTime(b.startsAt)}–${fmtTime(b.endsAt)} · ${b.studentName ?? ""}`}
                        >
                          {fmtTime(b.startsAt)} {b.studentName ?? ""}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 border-t border-line px-5 py-2.5 text-[11px] text-ink-soft">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-600" /> Confirmed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-gold-400" /> Pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy-900 ring-2 ring-navy-900" /> Yours
        </span>
        {onSlotClick && view === "day" && <span>Click an empty hour to start a booking request.</span>}
        {onDaySelect && view === "week" && <span>Click a day to pick an exact time slot.</span>}
      </div>
    </div>
  );
}
