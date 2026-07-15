"use client";

import { useEffect, useState } from "react";
import ChangePasswordForm from "@/components/ChangePasswordForm";

type Overview = { school: { name: string } };

export default function SchoolSettingsPage() {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/school/overview")
      .then((r) => r.json())
      .then((d: Overview) => setName(d.school?.name ?? ""))
      .catch(() => {});
  }, []);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/school/details", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The school name could not be saved.");
        return;
      }
      setNote("Saved.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">Your school details and account security.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={saveName} className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy-900">School name</h2>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-4 w-full rounded border border-line px-3 py-2 text-sm"
          />
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          {note && <p className="mt-3 text-sm font-semibold text-emerald-700">{note}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </form>

        <ChangePasswordForm />
      </div>
    </div>
  );
}
