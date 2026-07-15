"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Overview = {
  school: { id: number; name: string; createdAt: string };
  instructorCount: number;
  studentCount: number;
  sharingCount: number;
  assignedCount: number;
};

export default function SchoolDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    fetch("/api/school/overview")
      .then((r) => r.json())
      .then((d) => setData(d as Overview))
      .catch(() => {});
  }, []);

  const tiles = [
    { label: "Instructors", value: data ? String(data.instructorCount) : "…" },
    { label: "Students", value: data ? String(data.studentCount) : "…" },
    { label: "Sharing progress data", value: data ? String(data.sharingCount) : "…" },
    { label: "Assigned to an instructor", value: data ? String(data.assignedCount) : "…" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        {data?.school.name ?? "School dashboard"}
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        An overview of your instructors and students.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="font-display text-3xl font-semibold text-navy-900">{t.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">{t.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/school/instructors"
          className="rounded-lg border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Manage instructors →
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Add or remove instructor accounts for your school.
          </p>
        </Link>
        <Link
          href="/school/students"
          className="rounded-lg border border-line bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Manage students →
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            View your roster and assign students to instructors.
          </p>
        </Link>
      </div>

      {data && data.studentCount > 0 && data.sharingCount < data.studentCount && (
        <p className="mt-6 text-xs text-ink-soft">
          {data.studentCount - data.sharingCount} of your {data.studentCount} student
          {data.studentCount === 1 ? "" : "s"} {data.studentCount - data.sharingCount === 1 ? "has" : "have"} not
          opted in to share study progress data — their instructors won&apos;t be able
          to pull performance reports for them until they do.
        </p>
      )}
    </div>
  );
}
