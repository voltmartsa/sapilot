"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type CurrencyItem = { id: number; label: string; dueDate: string; note: string };

function daysUntil(dueDate: string): number {
  const ms = new Date(dueDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function urgencyStyle(days: number): string {
  if (days < 0) return "border-red-300 bg-red-50";
  if (days <= 30) return "border-gold-500/60 bg-gold-500/10";
  return "border-line bg-white";
}

function urgencyLabel(days: number): string {
  if (days < 0) return `Overdue by ${Math.abs(days)}d`;
  if (days === 0) return "Due today";
  return `Due in ${days}d`;
}

export default function CurrencyWidget() {
  const [items, setItems] = useState<CurrencyItem[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/student/currency")
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .catch(() => setItems([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/student/currency", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, dueDate, note }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add this item.");
        return;
      }
      setLabel("");
      setDueDate("");
      setNote("");
      setShowForm(false);
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeItem(id: number) {
    await fetch("/api/student/currency", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  if (items === null) return null;

  const sorted = [...items].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  return (
    <div className="mt-8 rounded-lg border border-line bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold text-navy-900">Currency tracker</h2>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50"
        >
          {showForm ? "Cancel" : "Add item"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addItem} className="mt-3 grid gap-2 rounded border border-line bg-navy-50/40 p-3 sm:grid-cols-[1fr_auto_auto]">
          <input
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Medical, BFR, Licence revalidation"
            className="rounded border border-line px-2.5 py-1.5 text-sm sm:col-span-1"
          />
          <input
            required
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded border border-line px-2.5 py-1.5 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add"}
          </button>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="rounded border border-line px-2.5 py-1.5 text-sm sm:col-span-3"
          />
          {error && <p className="text-xs font-semibold text-red-600 sm:col-span-3">{error}</p>}
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          Track medical, BFR, or licence revalidation dates so nothing lapses unnoticed.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sorted.map((item) => {
            const days = daysUntil(item.dueDate);
            return (
              <li
                key={item.id}
                className={`flex items-center justify-between gap-3 rounded border px-4 py-2.5 ${urgencyStyle(days)}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {new Date(item.dueDate).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}
                    {item.note && ` · ${item.note}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`text-xs font-semibold ${days < 0 ? "text-red-700" : days <= 30 ? "text-gold-700" : "text-ink-soft"}`}
                  >
                    {urgencyLabel(days)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="text-xs font-semibold text-ink-soft hover:text-red-600"
                    aria-label={`Remove ${item.label}`}
                  >
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 text-[11px] text-ink-soft">
        Manually entered by you — not derived from any regulatory database. Full logbook is on the{" "}
        <Link href="/dashboard/flights" className="font-semibold text-navy-800 hover:underline">
          Flights
        </Link>{" "}
        page.
      </p>
    </div>
  );
}
