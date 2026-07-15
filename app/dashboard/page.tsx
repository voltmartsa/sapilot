"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardShell";
import StudyRecommendations from "@/components/dashboard/StudyRecommendations";
import CurrencyWidget from "@/components/dashboard/CurrencyWidget";

type Overview = {
  stats: {
    sessionsCompleted: number;
    examsCompleted: number;
    questionsAnswered: number;
    questionsCorrect: number;
    bestExamPct: number;
    accuracy: number | null;
    savedCount: number;
  };
  sessions: {
    id: number;
    kind: string;
    status: string;
    label: string;
    total: number;
    answeredNow: number;
    correctCount: number | null;
    updatedAt: string;
  }[];
};

export default function DashboardOverviewPage() {
  const { activeSubjectId, activeSubject, loaded } = useDashboard();
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    setData(null);
    fetch(`/api/student/overview?subjectId=${activeSubjectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d as Overview);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  if (loaded && !activeSubjectId) {
    return (
      <div>
        <div className="rounded-lg border border-line bg-white p-10 text-center shadow-sm">
          <h1 className="font-display text-xl font-semibold text-navy-900">
            Welcome aboard
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-ink-soft">
            Subscribe to a qualification in Settings to unlock its subjects, then come
            back here to start practising.
          </p>
          <Link
            href="/dashboard/settings"
            className="mt-5 inline-block rounded bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-gold-400"
          >
            Open settings
          </Link>
        </div>
        <CurrencyWidget />
      </div>
    );
  }

  const s = data?.stats;
  const active = (data?.sessions ?? []).filter((x) => x.status === "active");
  const completed = (data?.sessions ?? []).filter((x) => x.status === "completed");

  const tiles = [
    { label: "Accuracy", value: s ? (s.accuracy === null ? "—" : `${s.accuracy}%`) : "…" },
    { label: "Questions answered", value: s ? s.questionsAnswered.toLocaleString("en-ZA") : "…" },
    { label: "Sessions completed", value: s ? String(s.sessionsCompleted) : "…" },
    { label: "Best exam score", value: s ? (s.examsCompleted > 0 ? `${s.bestExamPct}%` : "—") : "…" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Dashboard</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your progress in {activeSubject?.name ?? "…"}.
      </p>

      {/* Stat tiles */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <p className="font-display text-3xl font-semibold text-navy-900">{t.value}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.14em] text-ink-soft">
              {t.label}
            </p>
          </div>
        ))}
      </div>

      <StudyRecommendations subjectId={activeSubjectId} />

      <CurrencyWidget />

      {/* Resume outstanding sessions */}
      {active.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Pick up where you left off
          </h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {active.map((x) => (
              <div
                key={x.id}
                className="flex items-center justify-between gap-4 rounded-lg border-2 border-gold-500 bg-white p-5 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gold-600">
                    {x.kind === "exam" ? "Mock exam · paused" : "Practice · paused"}
                  </p>
                  <p className="mt-1 truncate text-sm font-semibold text-ink">{x.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {x.answeredNow}/{x.total} answered
                  </p>
                </div>
                <Link
                  href={
                    x.kind === "exam" ? `/exam/session/${x.id}` : `/practice/session/${x.id}`
                  }
                  className="shrink-0 rounded bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Resume
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">
          Previous sessions
        </h2>
        {data === null ? (
          <p className="mt-3 text-sm text-ink-soft">Loading…</p>
        ) : completed.length === 0 ? (
          <div className="mt-3 rounded-lg border border-line bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-ink-soft">
              No completed sessions in this subject yet.
            </p>
            <Link
              href="/dashboard/practice"
              className="mt-4 inline-block rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Start practising
            </Link>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
            <ul className="divide-y divide-line">
              {completed.map((x) => {
                const pct =
                  x.total > 0 && x.correctCount !== null
                    ? Math.round((x.correctCount / x.total) * 100)
                    : null;
                return (
                  <li key={x.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        <span
                          className={`mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                            x.kind === "exam"
                              ? "bg-navy-900 text-gold-400"
                              : "bg-navy-100 text-navy-800"
                          }`}
                        >
                          {x.kind}
                        </span>
                        {x.label}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-soft">
                        {new Date(x.updatedAt).toLocaleDateString("en-ZA", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {pct !== null && (
                        <span className="font-display text-lg font-semibold text-navy-900">
                          {pct}%
                        </span>
                      )}
                      <Link
                        href={`/results/${x.id}`}
                        className="rounded border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                      >
                        View results
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
