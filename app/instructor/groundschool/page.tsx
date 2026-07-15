"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GroundSchoolList, { type GroundSchoolItem } from "@/components/GroundSchoolList";
import { getCalendarRange, navigateAnchor } from "@/components/BookingCalendar";

function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InstructorGroundschoolPage() {
  const [view, setView] = useState<"day" | "week">("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [sessions, setSessions] = useState<GroundSchoolItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 1, 0, 0, 0);
  const defaultEnd = new Date(defaultStart);
  defaultEnd.setHours(defaultEnd.getHours() + 1);
  const [startsAt, setStartsAt] = useState(toLocalInputValue(defaultStart));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(defaultEnd));
  const [slotPicked, setSlotPicked] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [editing, setEditing] = useState<GroundSchoolItem | null>(null);

  const load = useCallback(() => {
    const { from, to } = getCalendarRange(view, anchorDate);
    fetch(`/api/instructor/groundschool?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setSessions((d.sessions ?? []) as GroundSchoolItem[]))
      .catch(() => setSessions([]));
  }, [view, anchorDate]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSlotClick(slotStart: Date, slotEnd: Date) {
    setStartsAt(toLocalInputValue(slotStart));
    setEndsAt(toLocalInputValue(slotEnd));
    setSlotPicked(true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDaySelect(date: Date) {
    setView("day");
    setAnchorDate(date);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/groundschool", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
          location,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The session could not be created.");
        return;
      }
      setTitle("");
      setLocation("");
      setNotes("");
      setSlotPicked(false);
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/groundschool", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          title: editing.title,
          startsAt: new Date(editing.startsAt).toISOString(),
          endsAt: new Date(editing.endsAt).toISOString(),
          location: editing.location,
          notes: editing.notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The session could not be saved.");
        return;
      }
      setEditing(null);
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Delete this groundschool session?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/instructor/groundschool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The session could not be deleted.");
        return;
      }
      setEditing(null);
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Groundschool</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Schedule and manage your groundschool sessions.
      </p>

      <form
        ref={formRef}
        onSubmit={submit}
        className="mt-6 rounded-lg border-2 border-navy-900 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-navy-900">New session</h2>
          {slotPicked && (
            <span className="rounded bg-gold-500/20 px-2.5 py-1 text-xs font-semibold text-gold-700">
              Time slot picked from the calendar — review and add below.
            </span>
          )}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs font-semibold text-ink sm:col-span-2 lg:col-span-1">
            Title
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meteorology revision"
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
            />
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
          <label className="text-xs font-semibold text-ink">
            Location (optional)
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Classroom 2"
              className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
            />
          </label>
        </div>
        <label className="mt-3 block text-xs font-semibold text-ink">
          Notes (optional)
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
          />
        </label>
        {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="mt-4 rounded bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Add session"}
        </button>
      </form>

      <div className="mt-6">
        <GroundSchoolList
          view={view}
          anchorDate={anchorDate}
          sessions={sessions}
          onNavigate={(dir) => setAnchorDate((d) => navigateAnchor(view, d, dir))}
          onViewChange={setView}
          onSessionClick={(s) => setEditing(s)}
          onSlotClick={handleSlotClick}
          onDaySelect={handleDaySelect}
        />
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-navy-900">Edit session</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink">
                Title
                <input
                  type="text"
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Starts
                <input
                  type="datetime-local"
                  value={toLocalInputValue(new Date(editing.startsAt))}
                  onChange={(e) => setEditing({ ...editing, startsAt: new Date(e.target.value).toISOString() })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Ends
                <input
                  type="datetime-local"
                  value={toLocalInputValue(new Date(editing.endsAt))}
                  onChange={(e) => setEditing({ ...editing, endsAt: new Date(e.target.value).toISOString() })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Location
                <input
                  type="text"
                  value={editing.location}
                  onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Notes
                <textarea
                  rows={2}
                  value={editing.notes}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void remove(editing.id)}
                className="rounded border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void saveEdit()}
                  className="rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
