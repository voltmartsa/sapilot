"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { optionsOf, type QuizQuestion } from "@/lib/types";
import QuestionImage from "@/components/QuestionImage";

type SessionPayload = {
  session: {
    id: number;
    kind: string;
    status: string;
    label: string;
    answers: Record<string, string>;
    currentIndex: number;
    totalSeconds: number | null;
    secondsUsed: number;
  };
  subject: { id: number; name: string; passMark: number };
  questions: QuizQuestion[];
};

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamPlayer({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const stateRef = useRef({ answers, index, secondsLeft, total: 0 });
  stateRef.current = {
    answers,
    index,
    secondsLeft,
    total: data?.session.totalSeconds ?? 0,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const payload = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(payload.error ?? "The examination could not be loaded.");
          return;
        }
        const p = payload as SessionPayload;
        if (p.session.status === "completed") {
          router.replace(`/results/${sessionId}`);
          return;
        }
        setData(p);
        setAnswers(p.session.answers ?? {});
        setIndex(Math.min(p.session.currentIndex, Math.max(0, p.questions.length - 1)));
        setSecondsLeft(Math.max(0, (p.session.totalSeconds ?? 0) - p.session.secondsUsed));
      } catch {
        if (!cancelled) setError("The examination could not be loaded.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, router]);

  const submit = useCallback(
    async (auto = false) => {
      setLeaving(true);
      setConfirmSubmit(false);
      const { answers: a, index: i, secondsLeft: left, total } = stateRef.current;
      await fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: a,
          currentIndex: i,
          secondsUsed: Math.max(0, total - (auto ? 0 : left)),
          status: "completed",
        }),
      }).catch(() => {});
      router.replace(`/results/${sessionId}`);
    },
    [sessionId, router],
  );

  // Countdown + periodic server sync every 15s.
  useEffect(() => {
    if (!data || leaving) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          void submit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    const sync = setInterval(() => {
      const { answers: a, index: i, secondsLeft: left, total } = stateRef.current;
      void fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: a,
          currentIndex: i,
          secondsUsed: Math.max(0, total - left),
        }),
      }).catch(() => {});
    }, 15000);
    return () => {
      clearInterval(interval);
      clearInterval(sync);
    };
  }, [data, leaving, sessionId, submit]);

  async function pause() {
    setLeaving(true);
    const { answers: a, index: i, secondsLeft: left, total } = stateRef.current;
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: a,
        currentIndex: i,
        secondsUsed: Math.max(0, total - left),
      }),
    }).catch(() => {});
    router.push("/dashboard/exams");
  }

  if (error) {
    return (
      <div className="rounded-lg border border-line bg-white p-12 text-center shadow-sm">
        <p className="text-sm text-ink-soft">{error}</p>
        <Link
          href="/dashboard/exams"
          className="mt-5 inline-block rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Back to exams
        </Link>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-lg border border-line bg-white p-12 text-center text-sm text-ink-soft shadow-sm">
        Preparing your examination paper…
      </div>
    );
  }

  const { questions, subject } = data;
  const q = questions[index];
  const options = optionsOf(q);
  const answeredCount = Object.keys(answers).length;
  const lowTime = secondsLeft <= 300;

  return (
    <div>
      {/* Exam header */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Mock examination
            </p>
            <p className="font-display text-base font-semibold text-navy-900">
              {subject.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-ink-soft sm:inline">
              {answeredCount}/{questions.length} answered
            </span>
            <span
              className={`rounded px-3 py-1.5 font-mono text-lg font-semibold tabular-nums ${
                lowTime ? "bg-red-100 text-red-700" : "bg-navy-900 text-gold-400"
              }`}
            >
              {formatClock(secondsLeft)}
            </span>
            <button
              type="button"
              disabled={leaving}
              onClick={() => void pause()}
              className="rounded border border-navy-800 px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
              title="Save progress and stop the clock"
            >
              Pause
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        <div className="rounded-lg border border-line bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-line px-6 py-3">
            <span className="text-sm font-semibold text-navy-900">
              Question {index + 1} of {questions.length}
            </span>
            <button
              type="button"
              onClick={() =>
                setFlagged((prev) => {
                  const next = new Set(prev);
                  if (next.has(q.id)) next.delete(q.id);
                  else next.add(q.id);
                  return next;
                })
              }
              className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                flagged.has(q.id)
                  ? "border-gold-500 bg-gold-500 text-navy-950"
                  : "border-line text-ink-soft hover:border-gold-500 hover:text-gold-600"
              }`}
            >
              {flagged.has(q.id) ? "Flagged" : "Flag for review"}
            </button>
          </div>
          <div className="px-6 py-6">
            <p className="text-base font-medium leading-relaxed text-ink whitespace-pre-line">
              {q.text}
            </p>
            {q.imageId && <QuestionImage imageId={q.imageId} />}
            <div className="mt-6 space-y-3">
              {options.map((o) => {
                const selected = answers[String(q.id)] === o.key;
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() =>
                      setAnswers((prev) => ({ ...prev, [String(q.id)]: o.key }))
                    }
                    className={`flex w-full items-start gap-3 rounded border px-4 py-3 text-left text-sm transition-colors ${
                      selected
                        ? "border-navy-900 bg-navy-50 ring-1 ring-navy-900"
                        : "border-line bg-white hover:border-navy-700 hover:bg-navy-50"
                    }`}
                  >
                    <span className="font-display mt-px font-semibold text-navy-800">
                      {o.key}.
                    </span>
                    <span className="whitespace-pre-line">{o.text}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
              className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            {index + 1 < questions.length ? (
              <button
                type="button"
                onClick={() => setIndex((i) => i + 1)}
                className="rounded bg-navy-900 px-6 py-2 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSubmit(true)}
                className="rounded bg-gold-500 px-6 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400"
              >
                Submit paper
              </button>
            )}
          </div>
        </div>

        {/* Navigator (answered/unanswered only — no correctness during the exam) */}
        <div className="rounded-lg border border-line bg-white p-4 shadow-sm lg:sticky lg:top-36 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
            Navigator
          </p>
          <div className="mt-3 grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
            {questions.map((item, i) => {
              const isCurrent = i === index;
              const isAnswered = answers[String(item.id)] !== undefined;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(i)}
                  className={`relative h-8 rounded text-xs font-semibold transition-colors ${
                    isCurrent
                      ? "bg-navy-900 text-white ring-2 ring-gold-500"
                      : isAnswered
                        ? "bg-navy-100 text-navy-900 hover:bg-navy-700 hover:text-white"
                        : "border border-line bg-white text-ink-soft hover:border-navy-700"
                  }`}
                >
                  {i + 1}
                  {flagged.has(item.id) && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-gold-500" />
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setConfirmSubmit(true)}
            className="mt-4 w-full rounded bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400"
          >
            Submit paper
          </button>
        </div>
      </div>

      {confirmSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-xl">
            <h3 className="font-display text-xl font-semibold text-navy-900">
              Submit this paper?
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              You have answered {answeredCount} of {questions.length} questions
              {answeredCount < questions.length &&
                ` — ${questions.length - answeredCount} will be marked as unanswered`}
              . Once submitted, the paper is scored and cannot be resumed.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmSubmit(false)}
                className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
              >
                Keep working
              </button>
              <button
                type="button"
                disabled={leaving}
                onClick={() => void submit()}
                className="rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
              >
                Submit and score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
