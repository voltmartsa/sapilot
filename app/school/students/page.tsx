"use client";

import { useCallback, useEffect, useState } from "react";

type StudentRow = {
  id: number;
  name: string;
  email: string;
  shareWithSchool: boolean;
  instructorId: number | null;
  createdAt: string;
};
type InstructorOption = { id: number; name: string };

export default function SchoolStudentsPage() {
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/school/students")
      .then((r) => r.json())
      .then((d) => {
        setStudents((d.students ?? []) as StudentRow[]);
        setInstructors((d.instructors ?? []) as InstructorOption[]);
      })
      .catch(() => setStudents([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(studentId: number, instructorId: string) {
    setBusyId(studentId);
    setError(null);
    try {
      const res = await fetch("/api/school/students/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, instructorId: instructorId || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The assignment could not be saved.");
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
      <h1 className="font-display text-2xl font-semibold text-navy-900">Students</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Everyone affiliated with your school. Assign each student to an instructor —
        only students who&apos;ve opted in to sharing can have their progress reported
        on.
      </p>
      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {students === null ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : students.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">
            No students have affiliated with your school yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {students.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{s.name}</p>
                  <p className="text-xs text-ink-soft">{s.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      s.shareWithSchool ? "bg-emerald-100 text-emerald-800" : "bg-navy-100 text-navy-800"
                    }`}
                  >
                    {s.shareWithSchool ? "Sharing" : "Not sharing"}
                  </span>
                  <select
                    value={s.instructorId ?? ""}
                    disabled={busyId === s.id}
                    onChange={(e) => void assign(s.id, e.target.value)}
                    className="rounded border border-line bg-white px-2.5 py-1.5 text-xs"
                  >
                    <option value="">— Unassigned —</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
