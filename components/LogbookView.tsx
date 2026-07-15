"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type LogbookEntry = {
  id: string;
  source: "school" | "manual";
  date: string;
  aircraftType: string;
  registration: string;
  picName: string;
  route: string;
  dayNight: string | null;
  landings: number | null;
  instrumentHours: number | null;
  hours: number;
  role: string;
  notes: string;
};
type Totals = { total: number; dual: number; solo: number; pic: number; landings: number; instrument: number };

const ROLE_LABEL: Record<string, string> = { dual: "Dual", solo: "Solo", pic: "PIC" };

type ManualForm = {
  flightDate: string;
  aircraftType: string;
  registration: string;
  picName: string;
  route: string;
  dayNight: string;
  landings: string;
  instrumentHours: string;
  hours: string;
  role: string;
  notes: string;
};

const emptyForm: ManualForm = {
  flightDate: "",
  aircraftType: "",
  registration: "",
  picName: "",
  route: "",
  dayNight: "day",
  landings: "1",
  instrumentHours: "",
  hours: "",
  role: "dual",
  notes: "",
};

function csvEscape(value: string | number | Date | null): string {
  const s = value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(entries: LogbookEntry[]) {
  const lines: string[] = [];
  lines.push("Date,Aircraft,Registration,PIC,Route,Day/Night,Landings,Instrument,Role,Hours,Notes");
  for (const e of entries) {
    lines.push(
      [
        new Date(e.date).toLocaleDateString("en-ZA"),
        e.aircraftType,
        e.registration,
        e.picName,
        e.route,
        e.dayNight ? (e.dayNight === "day" ? "Day" : "Night") : "",
        e.landings ?? "",
        e.instrumentHours ?? "",
        e.role ? (ROLE_LABEL[e.role] ?? e.role) : "",
        e.hours,
        e.notes,
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "logbook.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function LogbookView({
  fetchUrl,
  backHref,
  backLabel,
}: {
  /** Endpoint returning { entries, totals } — merges school-sourced and manual entries. */
  fetchUrl: string;
  backHref: string;
  backLabel: string;
}) {
  const [entries, setEntries] = useState<LogbookEntry[] | null>(null);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ManualForm>(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<ManualForm>(emptyForm);

  const load = useCallback(() => {
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
          return;
        }
        setEntries(d.entries as LogbookEntry[]);
        setTotals(d.totals as Totals);
      })
      .catch(() => setError("Could not load your logbook."));
  }, [fetchUrl]);

  useEffect(() => {
    load();
  }, [load]);

  function toPayload(f: ManualForm) {
    return {
      flightDate: f.flightDate,
      aircraftType: f.aircraftType,
      registration: f.registration,
      picName: f.picName,
      route: f.route,
      dayNight: f.dayNight,
      landings: Number(f.landings),
      instrumentHours: f.instrumentHours === "" ? null : Number(f.instrumentHours),
      hours: Number(f.hours),
      role: f.role,
      notes: f.notes,
    };
  }

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/student/logbook/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not add this entry.");
        return;
      }
      setForm(emptyForm);
      setShowForm(false);
      load();
    } catch {
      setFormError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  function openEdit(e: LogbookEntry) {
    const id = Number(e.id.replace("manual-", ""));
    setEditingId(id);
    setEditForm({
      flightDate: new Date(e.date).toISOString().slice(0, 10),
      aircraftType: e.aircraftType,
      registration: e.registration,
      picName: e.picName,
      route: e.route,
      dayNight: e.dayNight ?? "day",
      landings: String(e.landings ?? 1),
      instrumentHours: e.instrumentHours === null ? "" : String(e.instrumentHours),
      hours: String(e.hours),
      role: e.role,
      notes: e.notes,
    });
  }

  async function saveEdit() {
    if (editingId === null) return;
    setBusy(true);
    setFormError(null);
    try {
      const res = await fetch("/api/student/logbook/manual", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...toPayload(editForm) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error ?? "Could not save this entry.");
        return;
      }
      setEditingId(null);
      load();
    } catch {
      setFormError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeEntry(id: number) {
    if (!window.confirm("Delete this logbook entry?")) return;
    setBusy(true);
    try {
      await fetch("/api/student/logbook/manual", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      setEditingId(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-red-700">{error}</p>;
  if (!entries || !totals) return <p className="text-sm text-ink-soft">Loading your logbook…</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={backHref} className="text-sm font-semibold text-navy-800 hover:text-gold-600">
          ← {backLabel}
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(entries)}
            disabled={entries.length === 0}
            className="rounded border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={entries.length === 0}
            className="rounded bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="mt-6 border-b border-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">Pilot logbook</p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-navy-900">Flight hours</h1>
        <p className="mt-1 text-sm text-ink-soft">
          Hours logged against confirmed school flights, plus any hours you've added yourself.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totals.total.toFixed(1)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Total hours</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totals.dual.toFixed(1)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Dual</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totals.solo.toFixed(1)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Solo</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totals.pic.toFixed(1)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">PIC</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totals.landings}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Landings</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-4 text-center shadow-sm">
          <p className="font-display text-2xl font-semibold text-navy-900">{totals.instrument.toFixed(1)}</p>
          <p className="mt-0.5 text-xs uppercase tracking-wider text-ink-soft">Instrument</p>
        </div>
      </div>

      <div className="mt-8 print:hidden">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-navy-900">Add previously flown hours</h2>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="rounded border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50"
          >
            {showForm ? "Cancel" : "Add hours"}
          </button>
        </div>
        {showForm && (
          <form
            onSubmit={addEntry}
            className="mt-3 grid gap-3 rounded-lg border-2 border-navy-900 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
          >
            <label className="text-xs font-semibold text-ink">
              Date
              <input
                type="date"
                required
                value={form.flightDate}
                onChange={(e) => setForm({ ...form, flightDate: e.target.value })}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Aircraft type
              <input
                type="text"
                required
                value={form.aircraftType}
                onChange={(e) => setForm({ ...form, aircraftType: e.target.value })}
                placeholder="e.g. Cessna 172"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Registration (optional)
              <input
                type="text"
                value={form.registration}
                onChange={(e) => setForm({ ...form, registration: e.target.value.toUpperCase() })}
                placeholder="e.g. ZS-ABC"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal uppercase"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              PIC
              <input
                type="text"
                required
                value={form.picName}
                onChange={(e) => setForm({ ...form, picName: e.target.value })}
                placeholder="Pilot in command's name"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink sm:col-span-2">
              Flight sequence
              <input
                type="text"
                value={form.route}
                onChange={(e) => setForm({ ...form, route: e.target.value })}
                placeholder="e.g. FALA-FAGC-FALA"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Day or night
              <select
                value={form.dayNight}
                onChange={(e) => setForm({ ...form, dayNight: e.target.value })}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              >
                <option value="day">Day</option>
                <option value="night">Night</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-ink">
              Role
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              >
                <option value="dual">Dual</option>
                <option value="solo">Solo</option>
                <option value="pic">PIC</option>
              </select>
            </label>
            <label className="text-xs font-semibold text-ink">
              Landings
              <input
                type="number"
                required
                min={0}
                max={20}
                step={1}
                value={form.landings}
                onChange={(e) => setForm({ ...form, landings: e.target.value })}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Instrument time (if any)
              <input
                type="number"
                min={0}
                max={24}
                step={0.1}
                value={form.instrumentHours}
                onChange={(e) => setForm({ ...form, instrumentHours: e.target.value })}
                placeholder="0.0"
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink">
              Total hours
              <input
                type="number"
                required
                min={0.1}
                max={24}
                step={0.1}
                value={form.hours}
                onChange={(e) => setForm({ ...form, hours: e.target.value })}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-xs font-semibold text-ink sm:col-span-2 lg:col-span-4">
              Notes (optional)
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            {formError && <p className="text-xs font-semibold text-red-600 sm:col-span-2 lg:col-span-4">{formError}</p>}
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50 sm:col-span-2 lg:col-span-4"
            >
              {busy ? "Adding…" : "Add entry"}
            </button>
          </form>
        )}
      </div>

      <div className="mt-8 mb-4">
        {entries.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No logged flights yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Aircraft</th>
                  <th className="px-4 py-2.5 font-semibold">PIC</th>
                  <th className="px-4 py-2.5 font-semibold">Route</th>
                  <th className="px-4 py-2.5 font-semibold">Day/Night</th>
                  <th className="px-4 py-2.5 font-semibold">Landings</th>
                  <th className="px-4 py-2.5 font-semibold">Instrument</th>
                  <th className="px-4 py-2.5 font-semibold">Role</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Hours</th>
                  <th className="px-4 py-2.5 font-semibold print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5 text-ink">
                      {new Date(e.date).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-2.5 text-ink">
                      {e.registration ? `${e.registration} ` : ""}
                      <span className="text-ink-soft">({e.aircraftType})</span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{e.picName || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{e.route || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {e.dayNight ? (e.dayNight === "day" ? "Day" : "Night") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{e.landings ?? "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {e.instrumentHours !== null ? e.instrumentHours.toFixed(1) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">{ROLE_LABEL[e.role] ?? e.role}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-navy-900">{e.hours.toFixed(1)}</td>
                    <td className="px-4 py-2.5 text-right print:hidden">
                      {e.source === "manual" && (
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
                          className="text-xs font-semibold text-navy-800 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4 print:hidden">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-navy-900">Edit logbook entry</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink">
                Date
                <input
                  type="date"
                  value={editForm.flightDate}
                  onChange={(e) => setEditForm({ ...editForm, flightDate: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink">
                Aircraft type
                <input
                  type="text"
                  value={editForm.aircraftType}
                  onChange={(e) => setEditForm({ ...editForm, aircraftType: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink">
                Registration
                <input
                  type="text"
                  value={editForm.registration}
                  onChange={(e) => setEditForm({ ...editForm, registration: e.target.value.toUpperCase() })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal uppercase"
                />
              </label>
              <label className="text-xs font-semibold text-ink">
                PIC
                <input
                  type="text"
                  value={editForm.picName}
                  onChange={(e) => setEditForm({ ...editForm, picName: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink sm:col-span-2">
                Flight sequence
                <input
                  type="text"
                  value={editForm.route}
                  onChange={(e) => setEditForm({ ...editForm, route: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink">
                Day or night
                <select
                  value={editForm.dayNight}
                  onChange={(e) => setEditForm({ ...editForm, dayNight: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                >
                  <option value="day">Day</option>
                  <option value="night">Night</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-ink">
                Role
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                >
                  <option value="dual">Dual</option>
                  <option value="solo">Solo</option>
                  <option value="pic">PIC</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-ink">
                Landings
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={1}
                  value={editForm.landings}
                  onChange={(e) => setEditForm({ ...editForm, landings: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink">
                Instrument time
                <input
                  type="number"
                  min={0}
                  max={24}
                  step={0.1}
                  value={editForm.instrumentHours}
                  onChange={(e) => setEditForm({ ...editForm, instrumentHours: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink">
                Total hours
                <input
                  type="number"
                  min={0.1}
                  max={24}
                  step={0.1}
                  value={editForm.hours}
                  onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-ink sm:col-span-2">
                Notes
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            {formError && <p className="mt-3 text-sm font-semibold text-red-600">{formError}</p>}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={busy}
                onClick={() => void removeEntry(editingId)}
                className="rounded border border-red-400 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
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
