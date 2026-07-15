"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Recommendation = {
  chapterId: number;
  chapterName: string;
  correct: number;
  wrong: number;
  unanswered: number;
  total: number;
  accuracy: number;
};

type Data = {
  hasExamData: boolean;
  examsAnalyzed: number;
  overallAccuracy: number | null;
  recommendations: Recommendation[];
};

function severity(accuracy: number): { label: string; badge: string; bar: string } {
  if (accuracy < 50) {
    return { label: "Critical", badge: "bg-red-100 text-red-700", bar: "bg-red-600" };
  }
  return { label: "Needs work", badge: "bg-gold-500/20 text-gold-700", bar: "bg-gold-500" };
}

export default function StudyRecommendations({ subjectId }: { subjectId: number | null }) {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [startingId, setStartingId] = useState<number | null>(null);

  useEffect(() => {
    if (!subjectId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setData(null);
    fetch(`/api/student/recommendations?subjectId=${subjectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setData(d as Data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [subjectId]);

  async function practiceChapter(chapterId: number) {
    if (!subjectId) return;
    setStartingId(chapterId);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "practice", subjectId, chapterIds: [chapterId] }),
      });
      const result = await res.json();
      if (!res.ok) {
        setStartingId(null);
        return;
      }
      router.push(`/practice/session/${result.session.id}`);
    } catch {
      setStartingId(null);
    }
  }

  if (!data || !data.hasExamData) return null;

  return (
    <div className="mt-8 overflow-hidden rounded-lg border-2 border-gold-500/70 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-400">
            <svg viewBox="0 0 20 20" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18 }}>
              <path d="M3 15.5l4.5-4.5 3 3 6.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.5 4.5H17v3.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Recommended study
            </h2>
            <p className="text-xs text-ink-soft">
              Based on your last {data.examsAnalyzed} mock exam{data.examsAnalyzed === 1 ? "" : "s"}
              {data.overallAccuracy !== null && ` · ${data.overallAccuracy}% overall accuracy`}
            </p>
          </div>
        </div>
      </div>

      {data.recommendations.length === 0 ? (
        <p className="px-5 py-5 text-sm text-ink-soft">
          No weak spots detected — every chapter you&apos;ve been examined on is holding
          up well. Keep sitting mock exams to refine this picture.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {data.recommendations.map((r) => {
            const sev = severity(r.accuracy);
            return (
              <li key={r.chapterId} className="flex items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{r.chapterName}</p>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${sev.badge}`}>
                      {sev.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <div className="h-1.5 w-full max-w-48 overflow-hidden rounded-full bg-navy-100">
                      <div
                        className={`h-full rounded-full ${sev.bar}`}
                        style={{ width: `${r.accuracy}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-ink-soft">
                      {r.accuracy}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-soft">
                    {r.correct} correct · {r.wrong} incorrect
                    {r.unanswered > 0 && ` · ${r.unanswered} unanswered`} across your exams
                  </p>
                </div>
                <button
                  type="button"
                  disabled={startingId !== null}
                  onClick={() => void practiceChapter(r.chapterId)}
                  className="shrink-0 rounded bg-navy-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-wait disabled:opacity-50"
                >
                  {startingId === r.chapterId ? "Starting…" : "Practice this chapter"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
