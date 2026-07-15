"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";

type SchoolRow = {
  id: number;
  name: string;
  createdAt: string;
  instructorCount: number;
  studentCount: number;
  adminCount: number;
};

export default function AdminSchoolsPage() {
  const { headers } = useAdmin();
  const [rows, setRows] = useState<SchoolRow[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const [adminFormFor, setAdminFormFor] = useState<number | null>(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const load = useCallback(() => {
    fetch("/api/admin/schools", { headers })
      .then((r) => r.json())
      .then((d) => setRows((d.schools ?? []) as SchoolRow[]))
      .catch(() => setRows([]));
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  async function createSchool(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The school could not be created.");
        return;
      }
      setNewName("");
      setNote(`Created "${data.school.name}".`);
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSchool(school: SchoolRow) {
    if (!window.confirm(`Delete "${school.name}"?`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/schools", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ id: school.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The school could not be deleted.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function createSchoolAdmin(e: React.FormEvent, schoolId: number) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/admin/school-admins", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId, name: adminName, email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The school admin account could not be created.");
        return;
      }
      setNote(`Created school admin ${data.schoolAdmin.email}. Share these credentials with them securely.`);
      setAdminFormFor(null);
      setAdminName("");
      setAdminEmail("");
      setAdminPassword("");
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Schools</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Create a school, then provision its first School Admin account. The school
        admin signs in at /login and can then create instructor accounts and assign
        students themselves.
      </p>

      <form
        onSubmit={createSchool}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4 shadow-sm"
      >
        <label className="text-sm">
          <span className="block text-xs font-semibold text-ink">New school name</span>
          <input
            type="text"
            required
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Skyline Aviation Academy"
            className="mt-1 w-72 rounded border border-line bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create school"}
        </button>
      </form>

      {note && <p className="mt-4 text-sm font-semibold text-emerald-700">{note}</p>}
      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {rows === null ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-ink-soft">No schools created yet.</p>
        ) : (
          rows.map((s) => (
            <div key={s.id} className="rounded-lg border border-line bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-display text-base font-semibold text-navy-900">{s.name}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {s.adminCount} admin{s.adminCount === 1 ? "" : "s"} · {s.instructorCount}{" "}
                    instructor{s.instructorCount === 1 ? "" : "s"} · {s.studentCount} student
                    {s.studentCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminFormFor(adminFormFor === s.id ? null : s.id)}
                    className="rounded border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                  >
                    {adminFormFor === s.id ? "Cancel" : "Create school admin"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteSchool(s)}
                    className="rounded border border-red-400 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {adminFormFor === s.id && (
                <form
                  onSubmit={(e) => void createSchoolAdmin(e, s.id)}
                  className="grid gap-3 border-t border-line bg-paper/50 px-5 py-4 sm:grid-cols-3"
                >
                  <input
                    type="text"
                    required
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Full name"
                    className="rounded border border-line px-3 py-2 text-sm"
                  />
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="Email"
                    className="rounded border border-line px-3 py-2 text-sm"
                  />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Initial password"
                    className="rounded border border-line px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={busy}
                    className="sm:col-span-3 rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
                  >
                    {busy ? "Creating…" : "Create school admin account"}
                  </button>
                </form>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
