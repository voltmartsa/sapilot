"use client";

import { useCallback, useEffect, useState } from "react";

type InstructorRow = {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  studentCount: number;
};

export default function SchoolInstructorsPage() {
  const [rows, setRows] = useState<InstructorRow[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/school/instructors")
      .then((r) => r.json())
      .then((d) => setRows((d.instructors ?? []) as InstructorRow[]))
      .catch(() => setRows([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addInstructor(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/school/instructors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The instructor account could not be created.");
        return;
      }
      setNote(`Created ${data.instructor.email}. Share these credentials with them securely.`);
      setName("");
      setEmail("");
      setPassword("");
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function removeInstructor(row: InstructorRow) {
    if (
      !window.confirm(
        `Remove ${row.name}? Their ${row.studentCount} assigned student${row.studentCount === 1 ? "" : "s"} will become unassigned.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/instructors", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructorId: row.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The instructor could not be removed.");
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
      <h1 className="font-display text-2xl font-semibold text-navy-900">Instructors</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Add instructor accounts and see how many students each one has.
      </p>

      <form
        onSubmit={addInstructor}
        className="mt-6 grid gap-3 rounded-lg border border-line bg-white p-5 shadow-sm sm:grid-cols-3"
      >
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="rounded border border-line px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="rounded border border-line px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Initial password"
          className="rounded border border-line px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="sm:col-span-3 rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add instructor"}
        </button>
      </form>

      {note && <p className="mt-4 text-sm font-semibold text-emerald-700">{note}</p>}
      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {rows === null ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">
            No instructors yet — add your first one above.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{r.name}</p>
                  <p className="text-xs text-ink-soft">{r.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-soft">
                    {r.studentCount} student{r.studentCount === 1 ? "" : "s"}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void removeInstructor(r)}
                    className="rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
