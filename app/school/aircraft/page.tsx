"use client";

import { useCallback, useEffect, useState } from "react";

type AircraftRow = {
  id: number;
  registration: string;
  type: string;
  status: "available" | "maintenance" | "offline";
  note: string;
};

const STATUS_STYLE: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800",
  maintenance: "bg-gold-500/20 text-gold-700",
  offline: "bg-red-100 text-red-700",
};
const STATUS_LABEL: Record<string, string> = {
  available: "Available",
  maintenance: "At maintenance",
  offline: "Offline",
};

export default function SchoolAircraftPage() {
  const [rows, setRows] = useState<AircraftRow[] | null>(null);
  const [registration, setRegistration] = useState("");
  const [type, setType] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AircraftRow | null>(null);

  const load = useCallback(() => {
    fetch("/api/school/aircraft")
      .then((r) => r.json())
      .then((d) => setRows((d.aircraft ?? []) as AircraftRow[]))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addAircraft(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/aircraft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registration, type, status: "available", note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The aircraft could not be added.");
        return;
      }
      setRegistration("");
      setType("");
      setNote("");
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(row: AircraftRow, status: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/aircraft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, status }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The status could not be changed.");
        return;
      }
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
      const res = await fetch("/api/school/aircraft", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editing.id,
          registration: editing.registration,
          type: editing.type,
          note: editing.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The aircraft could not be saved.");
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

  async function remove(row: AircraftRow) {
    if (!window.confirm(`Remove ${row.registration}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/aircraft", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The aircraft could not be removed.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Aircraft</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your fleet, with each aircraft&apos;s current status.
      </p>

      <form
        onSubmit={addAircraft}
        className="mt-6 grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm sm:grid-cols-4"
      >
        <input
          type="text"
          required
          value={registration}
          onChange={(e) => setRegistration(e.target.value.toUpperCase())}
          placeholder="Registration, e.g. ZS-ABC"
          className="rounded border border-line px-3 py-2 text-sm uppercase"
        />
        <input
          type="text"
          required
          value={type}
          onChange={(e) => setType(e.target.value)}
          placeholder="Type, e.g. Cessna 172"
          className="rounded border border-line px-3 py-2 text-sm"
        />
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="rounded border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add aircraft"}
        </button>
      </form>

      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {rows === null ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">No aircraft added yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-ink">
                    {r.registration} <span className="font-normal text-ink-soft">— {r.type}</span>
                  </p>
                  {r.note && <p className="text-xs text-ink-soft">{r.note}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={r.status}
                    disabled={busy}
                    onChange={(e) => void changeStatus(r, e.target.value)}
                    className={`rounded px-2 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">At maintenance</option>
                    <option value="offline">Offline</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setEditing({ ...r })}
                    className="rounded border border-navy-800 px-3 py-1 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(r)}
                    className="rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-navy-900">Edit aircraft</h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink">
                Registration
                <input
                  type="text"
                  value={editing.registration}
                  onChange={(e) => setEditing({ ...editing, registration: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal uppercase"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Type
                <input
                  type="text"
                  value={editing.type}
                  onChange={(e) => setEditing({ ...editing, type: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="block text-xs font-semibold text-ink">
                Note
                <textarea
                  rows={2}
                  value={editing.note}
                  onChange={(e) => setEditing({ ...editing, note: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-3">
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
      )}
    </div>
  );
}
