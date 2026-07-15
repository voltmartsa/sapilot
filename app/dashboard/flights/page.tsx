"use client";

import { useCallback, useEffect, useState } from "react";

type FlightRow = {
  id: number;
  aircraftRegistration: string;
  aircraftType: string;
  instructorName: string;
  startsAt: string;
  endsAt: string;
  purpose: string;
  status: string;
  cancelReasonCategory: string | null;
  cancelNote: string | null;
  cancelledAt: string | null;
  hoursLogged: number | null;
};
type FlightsData = {
  upcoming: FlightRow[];
  pending: FlightRow[];
  needsHours: FlightRow[];
  history: FlightRow[];
  cancelled: FlightRow[];
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
  return `${s.toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })} · ${s.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}–${e.toLocaleTimeString("en-ZA", { hour: "2-digit", minute: "2-digit" })}`;
}

function HoursForm({ booking, onLogged }: { booking: FlightRow; onLogged: () => void }) {
  const [hours, setHours] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/student/flights/log-hours", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: booking.id, hours: Number(hours) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The hours could not be logged.");
        return;
      }
      onLogged();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="number"
        required
        min={0.1}
        max={24}
        step={0.1}
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        placeholder="Hours"
        className="w-24 rounded border border-line px-2.5 py-1.5 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {busy ? "Logging…" : "Log hours"}
      </button>
      {error && <span className="text-xs font-semibold text-red-600">{error}</span>}
    </form>
  );
}

export default function StudentFlightsPage() {
  const [data, setData] = useState<FlightsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/student/flights")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setData(d as FlightsData);
      })
      .catch(() => setError("Could not load your flights."));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-sm text-ink-soft">Loading your flights…</p>;

  const totalHours = data.history.reduce((n, f) => n + (f.hoursLogged ?? 0), 0);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Flights</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your upcoming flights and logged hours with your school.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{data.upcoming.length}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Upcoming</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{data.needsHours.length}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Need hours logged</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totalHours.toFixed(1)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Logged hours</p>
        </div>
      </div>

      {/* Upcoming */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">Upcoming flights</h2>
        {data.upcoming.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No confirmed flights scheduled yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.upcoming.map((f) => (
              <li key={f.id} className="rounded-lg border border-line bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-ink">
                  {f.aircraftRegistration} ({f.aircraftType}) · {fmtRange(f.startsAt, f.endsAt)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  With {f.instructorName}
                  {f.purpose && ` · ${f.purpose}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pending */}
      {data.pending.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg font-semibold text-navy-900">Awaiting approval</h2>
          <ul className="mt-3 space-y-2">
            {data.pending.map((f) => (
              <li key={f.id} className="rounded-lg border border-gold-500/60 bg-gold-500/10 p-4">
                <p className="text-sm font-semibold text-ink">
                  {f.aircraftRegistration} · {fmtRange(f.startsAt, f.endsAt)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">
                  With {f.instructorName} — requested, awaiting school approval
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Log hours */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">Log hours</h2>
        {data.needsHours.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No flights waiting to be logged.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {data.needsHours.map((f) => (
              <li key={f.id} className="rounded-lg border-2 border-navy-900 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-ink">
                  {f.aircraftRegistration} ({f.aircraftType}) · {fmtRange(f.startsAt, f.endsAt)}
                </p>
                <p className="mt-0.5 text-xs text-ink-soft">With {f.instructorName}</p>
                <HoursForm booking={f} onLogged={load} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">Flight history</h2>
        {data.history.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No logged flights yet.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
            <ul className="divide-y divide-line">
              {data.history.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {f.aircraftRegistration} · {fmtRange(f.startsAt, f.endsAt)}
                    </p>
                    <p className="text-xs text-ink-soft">With {f.instructorName}</p>
                  </div>
                  <span className="font-display text-lg font-semibold text-navy-900">
                    {f.hoursLogged?.toFixed(1)}h
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Cancelled */}
      {data.cancelled.length > 0 && (
        <section className="mt-8 mb-4">
          <h2 className="font-display text-lg font-semibold text-navy-900">Recently cancelled</h2>
          <ul className="mt-3 space-y-2">
            {data.cancelled.map((f) => (
              <li key={f.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-ink">
                  {f.aircraftRegistration} · {fmtRange(f.startsAt, f.endsAt)}
                </p>
                <p className="mt-0.5 text-xs text-red-700">
                  {f.cancelReasonCategory ? CANCEL_LABEL[f.cancelReasonCategory] ?? f.cancelReasonCategory : "Cancelled"}
                  {f.cancelNote && ` — ${f.cancelNote}`}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
