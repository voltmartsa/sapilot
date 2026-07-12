"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAdmin } from "@/components/admin/AdminShell";

type Stats = {
  stats: {
    totalUsers: number;
    newThisWeek: number;
    totalQuestions: number;
    totalSessions: number;
    completedSessions: number;
    examsTaken: number;
    questionsAnswered: number;
    overallAccuracy: number | null;
    openReports: number;
    totalReports: number;
  };
  activeSubjects: { subjectName: string; sessions: number }[];
  coverage: { subjectId: number; subjectName: string; chapterCount: number; questionCount: number }[];
};

export default function AdminDashboardPage() {
  const { headers } = useAdmin();
  const [data, setData] = useState<Stats | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/stats", { headers })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d as Stats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [headers]);

  const s = data?.stats;
  const tiles = [
    { label: "Students", value: s ? String(s.totalUsers) : "…", sub: s ? `+${s.newThisWeek} this week` : "" },
    { label: "Questions in bank", value: s ? s.totalQuestions.toLocaleString("en-ZA") : "…", sub: "" },
    { label: "Sessions taken", value: s ? String(s.totalSessions) : "…", sub: s ? `${s.examsTaken} exams` : "" },
    { label: "Answers recorded", value: s ? s.questionsAnswered.toLocaleString("en-ZA") : "…", sub: s?.overallAccuracy !== null && s ? `${s.overallAccuracy}% accuracy` : "" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">The state of the question bank and its students.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="font-display text-3xl font-semibold text-navy-900">{t.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">{t.label}</p>
            {t.sub && <p className="mt-1 text-xs text-gold-600">{t.sub}</p>}
          </div>
        ))}
      </div>

      {s && s.openReports > 0 && (
        <Link
          href="/admin/flagged"
          className="mt-6 flex items-center justify-between rounded-lg border-2 border-red-400 bg-red-50 px-5 py-4 shadow-sm transition-colors hover:bg-red-100"
        >
          <span className="text-sm font-semibold text-red-800">
            {s.openReports} open question report{s.openReports === 1 ? "" : "s"} awaiting review
          </span>
          <span className="text-sm font-semibold text-red-700">Review →</span>
        </Link>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-display text-base font-semibold text-navy-900">
              Most practised subjects
            </h2>
          </div>
          {data === null ? (
            <p className="px-5 py-5 text-sm text-ink-soft">Loading…</p>
          ) : data.activeSubjects.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ink-soft">No sessions taken yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.activeSubjects.map((x) => (
                <li key={x.subjectName} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-ink">{x.subjectName}</span>
                  <span className="font-semibold text-navy-900">{x.sessions} sessions</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-line bg-white shadow-sm">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="font-display text-base font-semibold text-navy-900">
              Bank coverage
            </h2>
          </div>
          {data === null ? (
            <p className="px-5 py-5 text-sm text-ink-soft">Loading…</p>
          ) : (
            <ul className="divide-y divide-line">
              {data.coverage.map((x) => (
                <li key={x.subjectId} className="flex items-center justify-between px-5 py-3 text-sm">
                  <span className="text-ink">{x.subjectName}</span>
                  <span className="text-xs text-ink-soft">
                    {x.chapterCount} ch ·{" "}
                    <span className="font-semibold text-navy-900">{x.questionCount} q</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
