"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type StudentRow = {
  id: number;
  name: string;
  email: string;
  shareWithSchool: boolean;
  accuracy: number | null;
  sessions: number;
  lastActive: string | null;
};

export default function InstructorStudentsPage() {
  const [rows, setRows] = useState<StudentRow[] | null>(null);

  useEffect(() => {
    fetch("/api/instructor/students")
      .then((r) => r.json())
      .then((d) => setRows((d.students ?? []) as StudentRow[]))
      .catch(() => setRows([]));
  }, []);

  const sharing = (rows ?? []).filter((r) => r.shareWithSchool);
  const notSharing = (rows ?? []).filter((r) => !r.shareWithSchool);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">My students</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Students your school has assigned to you. Open a report for insights on where
        each one is struggling and how to help.
      </p>

      {rows === null ? (
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-ink-soft">
            No students have been assigned to you yet — ask your school administrator.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-3">
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                Sharing progress data ({sharing.length})
              </h2>
            </div>
            {sharing.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-soft">
                None of your assigned students have opted in to share their study data yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {sharing.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-ink">{s.name}</p>
                      <p className="text-xs text-ink-soft">{s.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-ink-soft">
                        {s.sessions} session{s.sessions === 1 ? "" : "s"}
                      </span>
                      <span className="font-display text-lg font-semibold text-navy-900">
                        {s.accuracy === null ? "—" : `${s.accuracy}%`}
                      </span>
                      <Link
                        href={`/instructor/students/${s.id}`}
                        className="rounded bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                      >
                        View report
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {notSharing.length > 0 && (
            <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
              <div className="border-b border-line px-5 py-3">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                  Not sharing progress data ({notSharing.length})
                </h2>
              </div>
              <ul className="divide-y divide-line">
                {notSharing.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <p className="text-sm font-medium text-ink">{s.name}</p>
                    <span className="text-xs text-ink-soft">
                      Report unavailable — this student has not opted in to sharing.
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
