"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import DualRangeSlider from "@/components/DualRangeSlider";
import ChapterSelect from "@/components/ChapterSelect";

type ChapterRow = { id: number; name: string; questionCount: number };

export default function SubjectLauncher({
  subject,
  chapters,
}: {
  subject: {
    id: number;
    name: string;
    examQuestions: number;
    examMinutes: number;
    passMark: number;
  };
  chapters: ChapterRow[];
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<number | null>(chapters[0]?.id ?? null);
  const [range, setRange] = useState({ start: 1, end: 1 });
  const [busy, setBusy] = useState<"practice" | "exam" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalQuestions = chapters.reduce((n, c) => n + c.questionCount, 0);
  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === selectedId) ?? null,
    [chapters, selectedId],
  );
  const chapterQuestions = selectedChapter?.questionCount ?? 0;

  useEffect(() => {
    setRange({ start: 1, end: Math.max(1, chapterQuestions) });
  }, [selectedId, chapterQuestions]);

  const examOptions = useMemo(() => {
    const opts = [20, 30, 40, 60].filter((n) => n <= totalQuestions);
    if (opts.length === 0 && totalQuestions > 0) opts.push(totalQuestions);
    return opts;
  }, [totalQuestions]);
  const [examCount, setExamCount] = useState<string>(() =>
    String(Math.min(subject.examQuestions, Math.max(totalQuestions, 1))),
  );

  async function createSession(body: Record<string, unknown>, kind: "practice" | "exam") {
    setBusy(kind);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The session could not be started.");
        setBusy(null);
        return;
      }
      router.push(
        kind === "practice"
          ? `/practice/session/${data.session.id}`
          : `/exam/session/${data.session.id}`,
      );
    } catch {
      setError("Could not reach the server.");
      setBusy(null);
    }
  }

  const examMinutes = Math.max(
    10,
    Math.round((Number(examCount) / subject.examQuestions) * subject.examMinutes),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      {/* Chapter picker */}
      <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy-900">Chapter</h2>
        <p className="mt-1 text-xs text-ink-soft">
          Practice runs one chapter at a time — select the one you are revising.
        </p>
        <div className="mt-4 max-h-[28rem] overflow-y-auto pr-1">
          <ChapterSelect
            chapters={chapters}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </div>

      {/* Launch panel */}
      <div className="space-y-6">
        <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-navy-900">
            Practice session
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {selectedChapter
              ? `${selectedChapter.name} has ${chapterQuestions} question${chapterQuestions === 1 ? "" : "s"} in syllabus order — slide to choose where to start and end. Immediate feedback, no time limit, pausable.`
              : "Select a chapter to begin."}
          </p>
          <div className="mt-4">
            <DualRangeSlider
              max={Math.max(1, chapterQuestions)}
              start={range.start}
              end={range.end}
              onChange={(start, end) => setRange({ start, end })}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              void createSession(
                {
                  kind: "practice",
                  subjectId: subject.id,
                  chapterIds: selectedId ? [selectedId] : [],
                  rangeStart: range.start,
                  rangeEnd: range.end,
                },
                "practice",
              )
            }
            disabled={busy !== null || !selectedId || chapterQuestions === 0}
            className="mt-5 w-full rounded bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "practice"
              ? "Starting…"
              : `Start practice (${Math.max(0, range.end - range.start + 1)} questions)`}
          </button>
        </div>

        <div className="rounded-lg border-2 border-navy-900 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-navy-900">
              Mock examination
            </h3>
            <span className="rounded bg-navy-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-navy-800">
              Timed
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            A random paper drawn from every chapter of {subject.name}, sat against the
            clock with no feedback until you submit. Pass mark {subject.passMark}%.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <label className="text-sm font-medium text-ink" htmlFor="exam-count">
              Paper length
            </label>
            <select
              id="exam-count"
              value={examCount}
              onChange={(e) => setExamCount(e.target.value)}
              className="rounded border border-line bg-white px-3 py-1.5 text-sm"
            >
              {examOptions.map((n) => (
                <option key={n} value={n}>
                  {n} questions
                </option>
              ))}
              {!examOptions.includes(Number(examCount)) && (
                <option value={examCount}>{examCount} questions</option>
              )}
            </select>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Time allowed: approximately {examMinutes} minutes.
          </p>
          <button
            type="button"
            onClick={() =>
              void createSession(
                { kind: "exam", subjectId: subject.id, count: Number(examCount) },
                "exam",
              )
            }
            disabled={busy !== null || totalQuestions === 0}
            className="mt-5 w-full rounded bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy === "exam" ? "Generating…" : "Begin mock examination"}
          </button>
        </div>

        {error && (
          <p className="rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
