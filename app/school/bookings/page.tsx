"use client";

import { useCallback, useEffect, useState } from "react";
import BookingCalendar, {
  type CalendarBooking,
  getCalendarRange,
  navigateAnchor,
} from "@/components/BookingCalendar";

type AircraftLite = { id: number; registration: string; type: string };
type BookingRow = CalendarBooking & {
  instructorName: string;
  studentName: string;
  purpose: string;
  declineReason: string | null;
  cancelReasonCategory: string | null;
  cancelNote: string | null;
  createdAt: string;
};

const CANCEL_LABEL: Record<string, string> = {
  weather: "Weather",
  maintenance: "Maintenance issues",
  student_cancellation: "Student cancellation",
  aircraft_unavailable: "Aircraft not available",
};

function fmtRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  return `${s.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · ${s.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}–${e.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
}

export default function SchoolBookingsPage() {
  const [aircraftList, setAircraftList] = useState<AircraftLite[]>([]);
  const [pending, setPending] = useState<BookingRow[] | null>(null);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [view, setView] = useState<"day" | "week">("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [declining, setDeclining] = useState<number | null>(null);
  const [declineText, setDeclineText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<BookingRow | null>(null);

  useEffect(() => {
    fetch("/api/school/aircraft")
      .then((r) => r.json())
      .then((d) => setAircraftList((d.aircraft ?? []).map((a: AircraftLite) => ({ id: a.id, registration: a.registration, type: a.type }))))
      .catch(() => {});
  }, []);

  const loadPending = useCallback(() => {
    fetch("/api/school/bookings?status=pending")
      .then((r) => r.json())
      .then((d) => setPending((d.bookings ?? []) as BookingRow[]))
      .catch(() => setPending([]));
  }, []);

  const loadCalendar = useCallback(() => {
    const { from, to } = getCalendarRange(view, anchorDate);
    fetch(`/api/school/bookings?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setCalendarBookings((d.bookings ?? []) as BookingRow[]))
      .catch(() => setCalendarBookings([]));
  }, [view, anchorDate]);

  useEffect(() => {
    loadPending();
  }, [loadPending]);
  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  async function decide(id: number, action: "accept" | "decline") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/school/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "decline" ? { id, action, declineReason: declineText } : { id, action },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The request could not be processed.");
        return;
      }
      setDeclining(null);
      setDeclineText("");
      loadPending();
      loadCalendar();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Bookings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Review pending flight requests and see the shared schedule.
      </p>

      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border-2 border-gold-500/70 bg-white shadow-sm">
        <div className="border-b border-line bg-paper/70 px-5 py-3.5">
          <h2 className="font-display text-base font-semibold text-navy-900">
            Pending requests {pending && pending.length > 0 && `(${pending.length})`}
          </h2>
        </div>
        {pending === null ? (
          <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
        ) : pending.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-soft">No pending requests.</p>
        ) : (
          <ul className="divide-y divide-line">
            {pending.map((b) => (
              <li key={b.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {b.aircraftRegistration} · {fmtRange(b.startsAt, b.endsAt)}
                    </p>
                    <p className="text-xs text-ink-soft">
                      {b.instructorName} flying with {b.studentName}
                      {b.purpose && ` · ${b.purpose}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => void decide(b.id, "accept")}
                      className="rounded bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === b.id}
                      onClick={() => setDeclining(declining === b.id ? null : b.id)}
                      className="rounded border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
                {declining === b.id && (
                  <div className="mt-3 rounded border border-line bg-paper/50 p-3">
                    <textarea
                      rows={2}
                      value={declineText}
                      onChange={(e) => setDeclineText(e.target.value)}
                      placeholder="Reason for declining…"
                      className="w-full rounded border border-line px-3 py-2 text-sm"
                    />
                    <div className="mt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeclining(null)}
                        className="rounded px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busyId === b.id || declineText.trim().length === 0}
                        onClick={() => void decide(b.id, "decline")}
                        className="rounded bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-40"
                      >
                        Confirm decline
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-6">
        <BookingCalendar
          view={view}
          anchorDate={anchorDate}
          aircraftList={aircraftList}
          bookings={calendarBookings}
          onNavigate={(dir) => setAnchorDate((d) => navigateAnchor(view, d, dir))}
          onViewChange={setView}
          onBookingClick={(b) => setDetail(calendarBookings.find((x) => x.id === b.id) as BookingRow)}
        />
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-lg font-semibold text-navy-900">
              {detail.aircraftRegistration} · {fmtRange(detail.startsAt, detail.endsAt)}
            </h3>
            <p className="mt-2 text-sm text-ink">
              {detail.instructorName} flying with {detail.studentName}
            </p>
            <p className="mt-1 text-xs uppercase tracking-wider text-ink-soft">{detail.status}</p>
            {detail.purpose && <p className="mt-2 text-sm text-ink-soft">{detail.purpose}</p>}
            {detail.declineReason && (
              <p className="mt-2 text-sm text-red-700">Declined: {detail.declineReason}</p>
            )}
            {detail.cancelReasonCategory && (
              <p className="mt-2 text-sm text-red-700">
                Cancelled ({CANCEL_LABEL[detail.cancelReasonCategory] ?? detail.cancelReasonCategory}): {detail.cancelNote}
              </p>
            )}
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="mt-5 w-full rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
