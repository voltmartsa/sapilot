"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";

type UserRow = {
  id: number;
  name: string;
  email: string;
  baseAirport: string | null;
  role: string;
  schoolName: string | null;
  createdAt: string;
  subscriptions: string[];
  sessions: number;
  answered: number;
  accuracy: number | null;
};

const ROLE_STYLE: Record<string, string> = {
  student: "bg-navy-100 text-navy-800",
  instructor: "bg-blue-100 text-blue-800",
  school_admin: "bg-gold-500/20 text-gold-700",
  super_admin: "bg-navy-900 text-gold-400",
};
const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  instructor: "Instructor",
  school_admin: "School Admin",
  super_admin: "Super Admin",
};

export default function AdminUsersPage() {
  const { headers } = useAdmin();
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/users", { headers })
      .then((r) => r.json())
      .then((d) => setRows((d.users ?? []) as UserRow[]))
      .catch(() => setRows([]));
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(u: UserRow) {
    if (
      !window.confirm(
        `Delete ${u.name} (${u.email})? Their sessions, saved questions and reports will also be removed. This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(u.id);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ userId: u.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The user could not be deleted.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Users</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Every registered account across all roles, with school affiliation, subscriptions
        and activity.
      </p>
      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
        {rows === null ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">
            No students have registered yet.
          </p>
        ) : (
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                <th className="px-4 py-3 font-semibold">User</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">School</th>
                <th className="px-4 py-3 font-semibold">Base</th>
                <th className="px-4 py-3 font-semibold">Subscriptions</th>
                <th className="px-4 py-3 font-semibold">Sessions</th>
                <th className="px-4 py-3 font-semibold">Accuracy</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.name}</p>
                    <p className="text-xs text-ink-soft">{u.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${ROLE_STYLE[u.role] ?? ROLE_STYLE.student}`}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">{u.schoolName ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.baseAirport ?? "—"}</td>
                  <td className="px-4 py-3">
                    {u.subscriptions.length === 0 ? (
                      <span className="text-xs text-ink-soft">none</span>
                    ) : (
                      <span className="flex flex-wrap gap-1">
                        {u.subscriptions.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-navy-100 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-800"
                          >
                            {s}
                          </span>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{u.sessions}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {u.accuracy === null ? "—" : `${u.accuracy}%`}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-soft">
                    {new Date(u.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === u.id}
                      onClick={() => void remove(u)}
                      className="rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      {busyId === u.id ? "Deleting…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
