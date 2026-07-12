"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardShell";

type SessionRow = {
  id: number;
  kind: string;
  status: string;
  label: string;
  total: number;
  answeredNow: number;
  correctCount: number | null;
  secondsUsed: number;
  createdAt: string;
  completedAt: string | null;
};

type SubjectMeta = {
  examQuestions: number;
  examMinutes: number;
  passMark: number;
};

export default function DashboardExamsPage() {
  const router = useRouter();
  const { activeSubjectId, activeSubject, loaded } = useDashboard();
  const [meta, setMeta] = useState<SubjectMeta | null>(null);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [exams, setExams] = useState<SessionRow[] | null>(null);
  const [count, setCount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    setExams(null);
    setMeta(null);
    setError(null);
    Promise.all([
      fetch(`/api/student/chapters?subjectId=${activeSubjectId}`).then((r) => r.json()),
      fetch(`/api/sessions?subjectId=${activeSubjectId}&kind=exam&limit=20`).then((r) =>
        r.json(),
      ),
    ])
      .then(([ch, se]) => {
        if (cancelled) return;
        const subject = ch.subject as (SubjectMeta & { id: number }) | undefined;
        const total = (ch.chapters ?? []).reduce(
          (n: number, c: { questionCount: number }) => n + c.questionCount,
          0,
        );
        setMeta(subject ?? null);
        setTotalQuestions(total);
        setCount(String(Math.min(subject?.examQuestions ?? 40, Math.max(total, 1))));
        setExams((se.sessions ?? []) as SessionRow[]);
      })
      .catch(() => {
        if (!cancelled) setExams([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  async function generate() {
    if (!activeSubjectId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "exam",
          subjectId: activeSubjectId,
          count: Number(count),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The exam could not be generated.");
        setBusy(false);
        return;
      }
      router.push(`/exam/session/${data.session.id}`);
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  if (loaded && !activeSubjectId) {
    return (
      <p className="text-sm text-ink-soft">
        Subscribe to a qualification in Settings to sit mock examinations.
      </p>
    );
  }

  const activeExams = (exams ?? []).filter((x) => x.status === "active");
  const pastExams = (exams ?? []).filter((x) => x.status === "completed").slice(0, 4);
  const options = [20, 30, 40, 60].filter((n) => n <= totalQuestions);
  if (options.length === 0 && totalQuestions > 0) options.push(totalQuestions);
  const minutes =
    meta && Number(count) > 0
      ? Math.max(10, Math.round((Number(count) / meta.examQuestions) * meta.examMinutes))
      : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Exams</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Timed mock examinations for {activeSubject?.name ?? "…"}, drawn at random from
        the full bank and scored against the {meta?.passMark ?? 75}% pass mark.
      </p>

      {/* Generate */}
      <div className="mt-6 rounded-lg border-2 border-navy-900 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Generate a new exam
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <label htmlFor="exam-count" className="text-sm font-medium text-ink">
                Paper length
              </label>
              <select
                id="exam-count"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                disabled={totalQuestions === 0}
                className="rounded border border-line bg-white px-3 py-2 text-sm"
              >
                {options.map((n) => (
                  <option key={n} value={n}>
                    {n} questions
                  </option>
                ))}
                {!options.includes(Number(count)) && count && (
                  <option value={count}>{count} questions</option>
                )}
              </select>
              {minutes !== null && (
                <span className="text-xs text-ink-soft">≈ {minutes} minutes</span>
              )}
            </div>
          </div>
          <button
            type="button"
            disabled={busy || totalQuestions === 0}
            onClick={() => void generate()}
            className="rounded bg-gold-500 px-6 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Generating…" : "Generate exam"}
          </button>
        </div>
        {totalQuestions === 0 && exams !== null && (
          <p className="mt-3 text-sm text-ink-soft">
            No questions have been published for this subject yet.
          </p>
        )}
        {error && (
          <p className="mt-3 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>

      {/* Paused exams */}
      {activeExams.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Paused exams
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            {activeExams.map((x) => (
              <div
                key={x.id}
                className="flex items-center justify-between gap-4 rounded-lg border-2 border-gold-500 bg-white p-5 shadow-sm"
              >
                <div>
                  <p className="text-sm font-semibold text-ink">{x.label}</p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {x.answeredNow}/{x.total} answered
                  </p>
                </div>
                <Link
                  href={`/exam/session/${x.id}`}
                  className="rounded bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Resume
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous exams (last 4) */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">
          Previous exams
        </h2>
        {exams === null ? (
          <p className="mt-3 text-sm text-ink-soft">Loading…</p>
        ) : pastExams.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            No exams completed in this subject yet — generate your first paper above.
          </p>
        ) : (
          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {pastExams.map((x) => {
              const pct =
                x.total > 0 && x.correctCount !== null
                  ? Math.round((x.correctCount / x.total) * 100)
                  : 0;
              const passed = pct >= (meta?.passMark ?? 75);
              return (
                <div
                  key={x.id}
                  className="flex flex-col rounded-lg border border-line bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between">
                    <span className="font-display text-3xl font-semibold text-navy-900">
                      {pct}%
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold uppercase text-white ${
                        passed ? "bg-emerald-600" : "bg-red-500"
                      }`}
                    >
                      {passed ? "Pass" : "Fail"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-ink-soft">
                    {x.correctCount}/{x.total} correct ·{" "}
                    {x.completedAt &&
                      new Date(x.completedAt).toLocaleDateString("en-ZA", {
                        day: "numeric",
                        month: "short",
                      })}
                  </p>
                  <Link
                    href={`/results/${x.id}`}
                    className="mt-4 rounded border border-navy-800 px-3 py-1.5 text-center text-xs font-semibold text-navy-800 hover:bg-navy-900 hover:text-white"
                  >
                    View results
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
