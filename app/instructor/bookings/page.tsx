"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import BookingCalendar, {
  type CalendarBooking,
  getCalendarRange,
  navigateAnchor,
} from "@/components/BookingCalendar";

type AircraftRow = {
  id: number;
  registration: string;
  type: string;
  status: string;
  arcExpiry: string | null;
  insuranceExpiry: string | null;
  nextInspectionDue: string | null;
};

const MAINTENANCE_WINDOW_DAYS = 30;

function maintenanceWarning(a: AircraftRow): string | null {
  const now = Date.now();
  const items: [string, string | null][] = [
    ["ARC", a.arcExpiry],
    ["insurance", a.insuranceExpiry],
    ["inspection", a.nextInspectionDue],
  ];
  for (const [label, dateStr] of items) {
    if (!dateStr) continue;
    const days = Math.ceil((new Date(dateStr).getTime() - now) / (1000 * 60 * 60 * 24));
    if (days < 0) return `${label} overdue`;
    if (days <= MAINTENANCE_WINDOW_DAYS) return `${label} due in ${days}d`;
  }
  return null;
}
type StudentRow = { id: number; name: string };
type BookingRow = CalendarBooking & {
  studentName: string;
  purpose: string;
  declineReason: string | null;
  cancelReasonCategory: string | null;
  cancelNote: string | null;
};

const CANCEL_OPTIONS = [
  { value: "weather", label: "Weather" },
  { value: "maintenance", label: "Maintenance issues" },
  { value: "student_cancellation", label: "Student cancellation" },
  { value: "aircraft_unavailable", label: "Aircraft not available" },
];
const CANCEL_LABEL: Record<string, string> = Object.fromEntries(CANCEL_OPTIONS.map((o) => [o.value, o.label]));

const STATUS_BADGE: Record<string, string> = {
  pending: "bg-gold-500/20 text-gold-700",
  confirmed: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-700",
  withdrawn: "bg-navy-100 text-navy-800",
  cancelled: "bg-red-100 text-red-700",
};

function fmtRange(startsAt: string, endsAt: string) {
  const s = new Date(startsAt);
  const e = new Date(endsAt);
  return `${s.toLocaleDateString("en-ZA", { day: "numeric", month: "short" })} · ${s.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}–${e.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
}

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InstructorBookingsPage() {
  const [aircraftList, setAircraftList] = useState<AircraftRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [myBookings, setMyBookings] = useState<BookingRow[] | null>(null);
  const [calendarBookings, setCalendarBookings] = useState<CalendarBooking[]>([]);
  const [view, setView] = useState<"day" | "week">("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Request form
  const [aircraftId, setAircraftId] = useState("");
  const [studentId, setStudentId] = useState("");
  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 1);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(defaultStart));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(defaultEnd));
  const [purpose, setPurpose] = useState("");
  const [slotPicked, setSlotPicked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Cancel modal
  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [cancelReason, setCancelReason] = useState(CANCEL_OPTIONS[0].value);
  const [cancelNote, setCancelNote] = useState("");

  useEffect(() => {
    fetch("/api/instructor/aircraft")
      .then((r) => r.json())
      .then((d) => setAircraftList((d.aircraft ?? []) as AircraftRow[]))
      .catch(() => {});
    fetch("/api/instructor/students")
      .then((r) => r.json())
      .then((d) => setStudents((d.students ?? []).map((s: { id: number; name: string }) => ({ id: s.id, name: s.name }))))
      .catch(() => {});
  }, []);

  const loadMine = useCallback(() => {
    fetch("/api/instructor/bookings")
      .then((r) => r.json())
      .then((d) => setMyBookings((d.bookings ?? []) as BookingRow[]))
      .catch(() => setMyBookings([]));
  }, []);

  const loadCalendar = useCallback(() => {
    const { from, to } = getCalendarRange(view, anchorDate);
    fetch(`/api/instructor/calendar?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setCalendarBookings((d.bookings ?? []) as CalendarBooking[]))
      .catch(() => setCalendarBookings([]));
  }, [view, anchorDate]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);
  useEffect(() => {
    loadCalendar();
  }, [loadCalendar]);

  const availableAircraft = aircraftList.filter((a) => a.status === "available");

  function handleSlotClick(pickedAircraftId: number, slotStart: Date, slotEnd: Date) {
    setAircraftId(String(pickedAircraftId));
    setStartsAt(toLocalInputValue(slotStart));
    setEndsAt(toLocalInputValue(slotEnd));
    setSlotPicked(true);
    setNote(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDaySelect(date: Date) {
    setView("day");
    setAnchorDate(date);
  }

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/instructor/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aircraftId: Number(aircraftId),
          studentId: Number(studentId),
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          purpose,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The booking request could not be created.");
        return;
      }
      setNote("Request sent to your school for approval.");
      setPurpose("");
      setSlotPicked(false);
      loadMine();
      loadCalendar();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw(id: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/bookings/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The request could not be withdrawn.");
        return;
      }
      loadMine();
      loadCalendar();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function submitCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: cancelTarget.id, reasonCategory: cancelReason, note: cancelNote }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The flight could not be cancelled.");
        return;
      }
      setCancelTarget(null);
      setCancelNote("");
      loadMine();
      loadCalendar();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Bookings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Request an aircraft, see the shared schedule, and manage your flights.
      </p>

      <form
        ref={formRef}
        onSubmit={submitRequest}
        className="mt-6 rounded-lg border-2 border-navy-900 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-navy-900">Request a booking</h2>
          {slotPicked && (
            <span className="rounded bg-gold-500/20 px-2.5 py-1 text-xs font-semibold text-gold-700">
              Time slot picked from the calendar — review and send below.
            </span>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-ink">
            Aircraft
            <select
              required
              value={aircraftId}
              onChange={(e) => {
                setAircraftId(e.target.value);
                setSlotPicked(false);
              }}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
            >
              <option value="">Select…</option>
              {availableAircraft.map((a) => {
                const warning = maintenanceWarning(a);
                return (
                  <option key={a.id} value={a.id}>
                    {a.registration} — {a.type}
                    {warning ? ` ⚠ ${warning}` : ""}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink">
            Student
            <select
              required
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
            >
              <option value="">Select…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-semibold text-ink">
            Starts
            <input
              type="datetime-local"
              required
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold text-ink">
            Ends
            <input
              type="datetime-local"
              required
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-ink">
          Purpose (optional)
          <input
            type="text"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="e.g. Circuit training"
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        {note && <p className="mt-3 text-sm font-semibold text-emerald-700">{note}</p>}
        <button
          type="submit"
          disabled={busy || availableAircraft.length === 0 || students.length === 0}
          className="mt-4 rounded bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Sending…" : "Send request"}
        </button>
        {students.length === 0 && (
          <p className="mt-2 text-xs text-ink-soft">You have no assigned students yet.</p>
        )}
      </form>

      <div className="mt-6">
        <BookingCalendar
          view={view}
          anchorDate={anchorDate}
          aircraftList={aircraftList}
          bookings={calendarBookings}
          onNavigate={(dir) => setAnchorDate((d) => navigateAnchor(view, d, dir))}
          onViewChange={setView}
          onSlotClick={handleSlotClick}
          onDaySelect={handleDaySelect}
        />
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        <div className="border-b border-line px-5 py-3.5">
          <h2 className="font-display text-base font-semibold text-navy-900">My bookings</h2>
        </div>
        {myBookings === null ? (
          <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
        ) : myBookings.length === 0 ? (
          <p className="px-5 py-6 text-sm text-ink-soft">No booking requests yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {myBookings.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {b.aircraftRegistration} · {fmtRange(b.startsAt, b.endsAt)}
                  </p>
                  <p className="text-xs text-ink-soft">
                    with {b.studentName}
                    {b.declineReason && ` · Declined: ${b.declineReason}`}
                    {b.cancelReasonCategory &&
                      ` · Cancelled (${CANCEL_LABEL[b.cancelReasonCategory] ?? b.cancelReasonCategory}): ${b.cancelNote}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_BADGE[b.status] ?? ""}`}>
                    {b.status}
                  </span>
                  {b.status === "pending" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void withdraw(b.id)}
                      className="rounded border border-navy-800 px-3 py-1 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                    >
                      Withdraw
                    </button>
                  )}
                  {b.status === "confirmed" && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancelTarget(b);
                        setCancelReason(CANCEL_OPTIONS[0].value);
                        setCancelNote("");
                      }}
                      className="rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Cancel flight
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-navy-900">Cancel flight</h3>
            <p className="mt-1 text-sm text-ink-soft">
              {cancelTarget.aircraftRegistration} · {fmtRange(cancelTarget.startsAt, cancelTarget.endsAt)}
            </p>
            <label className="mt-4 block text-xs font-semibold text-ink">
              Reason
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              >
                {CANCEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink">
              Note
              <textarea
                rows={3}
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                placeholder="Add a short note explaining the cancellation…"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
              >
                Keep flight
              </button>
              <button
                type="button"
                disabled={busy || cancelNote.trim().length < 5}
                onClick={() => void submitCancel()}
                className="rounded bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {busy ? "Cancelling…" : "Cancel flight"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
