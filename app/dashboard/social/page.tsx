"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDashboard } from "@/components/dashboard/DashboardShell";

type LeaderboardEntry = {
  rank: number;
  firstName: string;
  correct: number;
  accuracy: number;
  sessions: number;
  isYou: boolean;
};
type Leaderboard = {
  qualification: { id: number; shortName: string; name: string };
  period: "week" | "month";
  totalRanked: number;
  top: LeaderboardEntry[];
  you: {
    rank: number;
    correct: number;
    accuracy: number;
    sessions: number;
    optedIn: boolean;
    inTop: boolean;
  } | null;
};

const MEDAL = ["🥇", "🥈", "🥉"];

export default function SocialPage() {
  const { activeQualification, loaded } = useDashboard();
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [data, setData] = useState<Leaderboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [optBusy, setOptBusy] = useState(false);

  useEffect(() => {
    if (!activeQualification) return;
    let cancelled = false;
    setData(null);
    setError(null);
    fetch(
      `/api/social/leaderboard?qualificationId=${activeQualification.qualificationId}&period=${period}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setError(d.error);
          return;
        }
        setData(d as Leaderboard);
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the server.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeQualification, period]);

  async function optIn() {
    setOptBusy(true);
    try {
      await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardOptIn: true }),
      });
      // Refetch so "you" reflects the new opted-in state.
      if (activeQualification) {
        const res = await fetch(
          `/api/social/leaderboard?qualificationId=${activeQualification.qualificationId}&period=${period}`,
        );
        setData(await res.json());
      }
    } finally {
      setOptBusy(false);
    }
  }

  if (loaded && !activeQualification) {
    return (
      <p className="text-sm text-ink-soft">
        Subscribe to a qualification in Settings to see its leaderboard.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-navy-900">Social</h1>
          <p className="mt-1 text-sm text-ink-soft">
            See how your studying compares with other {activeQualification?.shortName ?? "…"}{" "}
            students. First names only, and only for students who opt in.
          </p>
        </div>
        <div className="flex rounded-lg border border-line bg-white p-1 shadow-sm">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`rounded px-4 py-1.5 text-sm font-semibold capitalize transition-colors ${
                period === p ? "bg-navy-900 text-white" : "text-ink-soft hover:text-navy-900"
              }`}
            >
              This {p}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {!error && data === null && (
        <p className="mt-6 text-sm text-ink-soft">Loading leaderboard…</p>
      )}

      {data && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* Leaderboard */}
          <div className="overflow-hidden rounded-lg border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-semibold text-navy-900">
                {data.qualification.shortName} leaderboard — this {data.period}
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">
                Ranked by questions answered correctly · {data.totalRanked} student
                {data.totalRanked === 1 ? "" : "s"} active this {data.period}
              </p>
            </div>
            {data.top.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-soft">
                No one has opted in to the leaderboard yet
                {data.totalRanked > 0 ? " — be the first!" : " this " + data.period + "."}
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {data.top.map((entry) => (
                  <li
                    key={entry.rank}
                    className={`flex items-center gap-4 px-5 py-3.5 ${
                      entry.isYou ? "bg-gold-500/10" : ""
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        entry.rank <= 3
                          ? "text-lg"
                          : "bg-navy-100 text-navy-800"
                      }`}
                    >
                      {entry.rank <= 3 ? MEDAL[entry.rank - 1] : entry.rank}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-ink">
                          {entry.firstName}
                        </span>
                        {entry.isYou && (
                          <span className="shrink-0 rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold uppercase text-navy-950">
                            You
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-ink-soft">
                        {entry.sessions} session{entry.sessions === 1 ? "" : "s"} ·{" "}
                        {entry.accuracy}% accuracy
                      </span>
                    </span>
                    <span className="font-display shrink-0 text-lg font-semibold text-navy-900">
                      {entry.correct}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Your standing */}
          <div className="space-y-6 lg:self-start">
            <div className="rounded-lg border-2 border-navy-900 bg-white p-6 shadow-sm">
              <h3 className="font-display text-base font-semibold text-navy-900">
                Your standing
              </h3>
              {data.you === null ? (
                <p className="mt-2 text-sm text-ink-soft">
                  You haven&apos;t completed any sessions this {data.period} yet. Finish a
                  practice or mock exam to get ranked.
                </p>
              ) : (
                <>
                  <p className="font-display mt-3 text-4xl font-semibold text-gold-600">
                    #{data.you.rank}
                  </p>
                  <p className="mt-1 text-sm text-ink-soft">
                    of {data.totalRanked} active student{data.totalRanked === 1 ? "" : "s"}
                  </p>
                  <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Correct answers</dt>
                      <dd className="font-semibold text-ink">{data.you.correct}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Accuracy</dt>
                      <dd className="font-semibold text-ink">{data.you.accuracy}%</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-ink-soft">Sessions</dt>
                      <dd className="font-semibold text-ink">{data.you.sessions}</dd>
                    </div>
                  </dl>
                </>
              )}

              {data.you && !data.you.optedIn && (
                <div className="mt-4 rounded border-l-4 border-gold-500 bg-paper p-3.5">
                  <p className="text-xs leading-relaxed text-ink-soft">
                    Your rank is private — only you can see it. Opt in to appear on the
                    board (first name only) for other {data.qualification.shortName}{" "}
                    students.
                  </p>
                  <button
                    type="button"
                    disabled={optBusy}
                    onClick={() => void optIn()}
                    className="mt-3 w-full rounded bg-gold-500 px-4 py-2 text-xs font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
                  >
                    {optBusy ? "Joining…" : "Join the leaderboard"}
                  </button>
                </div>
              )}
              {data.you?.optedIn && (
                <p className="mt-4 text-xs text-emerald-700">
                  ✓ You&apos;re visible on this leaderboard.{" "}
                  <Link href="/dashboard/settings" className="font-semibold underline">
                    Manage in Settings
                  </Link>
                </p>
              )}
            </div>

            <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
              <p className="text-xs leading-relaxed text-ink-soft">
                Leaderboards are private by default. Nothing is shown to other students
                unless you choose to join, and even then only your first name, correct
                answer count, accuracy and session count are visible — never your email
                or full name.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
