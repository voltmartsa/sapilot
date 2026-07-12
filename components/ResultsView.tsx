"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { optionsOf, type QuizQuestion } from "@/lib/types";
import DonutChart from "@/components/DonutChart";
import QuestionImage from "@/components/QuestionImage";
import QuestionActions from "@/components/QuestionActions";

type SessionPayload = {
  session: {
    id: number;
    kind: string;
    status: string;
    label: string;
    answers: Record<string, string>;
    totalSeconds: number | null;
    secondsUsed: number;
    completedAt: string | null;
  };
  subject: { id: number; name: string; passMark: number };
  questions: QuizQuestion[];
};

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ResultsView({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const payload = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(payload.error ?? "The results could not be loaded.");
          return;
        }
        const p = payload as SessionPayload;
        if (p.session.status !== "completed") {
          router.replace(
            p.session.kind === "exam"
              ? `/exam/session/${sessionId}`
              : `/practice/session/${sessionId}`,
          );
          return;
        }
        setData(p);
      } catch {
        if (!cancelled) setError("The results could not be loaded.");
      }
    })();
    fetch("/api/student/saved")
      .then((r) => (r.ok ? r.json() : { questionIds: [] }))
      .then((d: { questionIds?: number[] }) => {
        if (!cancelled) setSavedIds(new Set(d.questionIds ?? []));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  function handleSavedChange(questionId: number, saved: boolean) {
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(questionId);
      else next.delete(questionId);
      return next;
    });
  }

  if (error) {
    return (
      <div className="rounded-lg border border-line bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-ink-soft">{error}</p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-lg border border-line bg-white p-12 text-center text-sm text-ink-soft shadow-sm">
        Marking your paper…
      </div>
    );
  }

  const { session, subject, questions } = data;
  const answers = session.answers ?? {};
  const correct = questions.filter((q) => answers[String(q.id)] === q.correct).length;
  const answered = questions.filter((q) => answers[String(q.id)] !== undefined).length;
  const wrong = answered - correct;
  const unanswered = questions.length - answered;
  const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const isExam = session.kind === "exam";
  const passed = pct >= subject.passMark;

  const q = questions[index];
  const picked = answers[String(q.id)];

  return (
    <div>
      {/* Score summary */}
      <div
        className={`rounded-lg border-2 bg-white p-8 shadow-sm ${
          isExam ? (passed ? "border-emerald-600" : "border-red-400") : "border-navy-900"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-soft">
              {isExam ? "Mock examination result" : "Practice session result"}
            </p>
            <h1 className="font-display mt-1 text-2xl font-semibold text-navy-900">
              {subject.name}
              <span className="ml-2 text-sm font-normal text-ink-soft">{session.label}</span>
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {isExam && (
              <span
                className={`rounded px-4 py-1 text-sm font-bold uppercase tracking-wider text-white ${
                  passed ? "bg-emerald-600" : "bg-red-500"
                }`}
              >
                {passed ? "Pass" : "Fail"}
              </span>
            )}
            <Link
              href="/dashboard"
              className="rounded border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
            >
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <DonutChart
            correct={correct}
            wrong={wrong}
            unanswered={unanswered}
            centerLabel={`${pct}%`}
            centerSub={isExam ? `pass mark ${subject.passMark}%` : "score"}
          />
        </div>
        {isExam && session.totalSeconds !== null && (
          <p className="mt-6 text-center text-xs text-ink-soft">
            Time used {formatClock(session.secondsUsed)} of{" "}
            {formatClock(session.totalSeconds)}
          </p>
        )}
      </div>

      {/* Solutions */}
      <h2 className="font-display mt-10 text-2xl font-semibold text-navy-900">Solutions</h2>
      <p className="mt-1 text-sm text-ink-soft">
        One question at a time — your answer, the correct answer and the full solution.
        Use the navigator to jump to any question.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="rounded-lg border border-line bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-3">
            <span className="pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
              Question {index + 1} of {questions.length} · {q.chapterName}
            </span>
            <div className="flex items-center gap-3">
              <span
                className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${
                  picked === undefined
                    ? "bg-navy-100 text-navy-800"
                    : picked === q.correct
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-red-100 text-red-700"
                }`}
              >
                {picked === undefined ? "Unanswered" : picked === q.correct ? "Correct" : "Incorrect"}
              </span>
              <QuestionActions
                questionId={q.id}
                saved={savedIds.has(q.id)}
                onSavedChange={handleSavedChange}
              />
            </div>
          </div>
          <div className="px-6 py-6">
            <p className="text-base font-medium leading-relaxed text-ink whitespace-pre-line">
              {q.text}
            </p>
            {q.imageId && <QuestionImage imageId={q.imageId} />}
            <div className="mt-5 space-y-2.5">
              {optionsOf(q).map((o) => {
                let style = "border-line";
                if (o.key === q.correct) style = "border-emerald-600 bg-emerald-50";
                else if (o.key === picked) style = "border-red-500 bg-red-50";
                return (
                  <div
                    key={o.key}
                    className={`flex items-start gap-3 rounded border px-4 py-2.5 text-sm ${style}`}
                  >
                    <span className="font-display font-semibold text-navy-800">{o.key}.</span>
                    <span className="flex-1 whitespace-pre-line">{o.text}</span>
                    {o.key === q.correct && (
                      <span className="text-xs font-semibold uppercase text-emerald-700">
                        Correct answer
                      </span>
                    )}
                    {o.key === picked && o.key !== q.correct && (
                      <span className="text-xs font-semibold uppercase text-red-600">
                        Your answer
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-5 rounded border-l-4 border-gold-500 bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
                Solution
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft whitespace-pre-line">
                {q.explanation || `The correct answer is ${q.correct}.`}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={index + 1 >= questions.length}
              onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
              className="rounded bg-navy-900 px-6 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </div>

        {/* Navigator */}
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
            Navigator
          </p>
          <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
            {questions.map((item, i) => {
              const a = answers[String(item.id)];
              const state = a === undefined ? "blank" : a === item.correct ? "correct" : "wrong";
              const isCurrent = i === index;
              const color =
                state === "correct"
                  ? "bg-emerald-700 text-white hover:bg-emerald-600"
                  : state === "wrong"
                    ? "bg-red-600 text-white hover:bg-red-500"
                    : "border border-line bg-white text-ink-soft hover:border-navy-700";
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`h-8 rounded text-xs font-semibold transition-colors ${color} ${
                    isCurrent ? "ring-2 ring-gold-500 ring-offset-1" : ""
                  }`}
                  aria-label={`Question ${i + 1}${
                    state === "blank" ? ", unanswered" : state === "correct" ? ", correct" : ", incorrect"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-ink-soft">
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" /> Correct ({correct})
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-600" /> Incorrect ({wrong})
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm border border-line bg-white" /> Unanswered ({unanswered})
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
