"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileForm({
  initialName,
  initialBaseAirport,
  email,
}: {
  initialName: string;
  initialBaseAirport: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [baseAirport, setBaseAirport] = useState(initialBaseAirport);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, baseAirport }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Your details could not be saved.");
        return;
      }
      setNote("Saved.");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-ink">Email address</label>
        <p className="mt-1.5 rounded border border-line bg-paper/60 px-3 py-2 text-sm text-ink-soft">
          {email}
        </p>
      </div>
      <div>
        <label htmlFor="p-name" className="block text-sm font-semibold text-ink">
          Full name
        </label>
        <input
          id="p-name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
        />
      </div>
      <div>
        <label htmlFor="p-airport" className="block text-sm font-semibold text-ink">
          Base airport (ICAO)
        </label>
        <input
          id="p-airport"
          type="text"
          required
          maxLength={4}
          value={baseAirport}
          onChange={(e) => setBaseAirport(e.target.value.toUpperCase())}
          placeholder="e.g. FALA"
          className="mt-1.5 w-40 rounded border border-line bg-white px-3 py-2 text-sm uppercase tracking-widest focus:border-navy-700 focus:outline-none"
        />
        <p className="mt-1 text-xs text-ink-soft">
          South African ICAO code in the FA format — FALA, FACT, FAGG…
        </p>
      </div>
      {error && (
        <p className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {note && <p className="text-sm font-semibold text-emerald-700">{note}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Save details"}
      </button>
    </form>
  );
}
