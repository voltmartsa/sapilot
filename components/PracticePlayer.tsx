"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { optionsOf, type QuizQuestion } from "@/lib/types";
import QuestionImage from "@/components/QuestionImage";
import QuestionActions from "@/components/QuestionActions";

type SessionPayload = {
  session: {
    id: number;
    kind: string;
    status: string;
    label: string;
    answers: Record<string, string>;
    currentIndex: number;
  };
  subject: { id: number; name: string; passMark: number };
  questions: QuizQuestion[];
};

export default function PracticePlayer({ sessionId }: { sessionId: number }) {
  const router = useRouter();
  const [data, setData] = useState<SessionPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [leaving, setLeaving] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        const payload = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(payload.error ?? "The session could not be loaded.");
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
      } catch {
        if (!cancelled) setError("The session could not be loaded.");
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

  const persist = useCallback(
    (patch: Record<string, unknown>) => {
      void fetch(`/api/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => {});
    },
    [sessionId],
  );

  // Debounced position persistence so arrow-clicking doesn't spam the API.
  const schedulePersist = useCallback(
    (nextAnswers: Record<string, string>, nextIndex: number) => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        persist({ answers: nextAnswers, currentIndex: nextIndex });
      }, 400);
    },
    [persist],
  );

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
        Loading your practice session…
      </div>
    );
  }

  const { questions, subject, session } = data;
  const q = questions[index];
  const picked = answers[String(q.id)];
  const answered = picked !== undefined;
  const isCorrect = picked === q.correct;
  const options = optionsOf(q);
  const correctSoFar = questions.filter(
    (item) => answers[String(item.id)] === item.correct,
  ).length;
  const answeredCount = Object.keys(answers).length;

  function choose(letter: string) {
    if (answered) return;
    const next = { ...answers, [String(q.id)]: letter };
    setAnswers(next);
    schedulePersist(next, index);
  }

  function go(i: number) {
    const clamped = Math.min(Math.max(0, i), questions.length - 1);
    setIndex(clamped);
    schedulePersist(answers, clamped);
  }

  async function pause() {
    setLeaving(true);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, currentIndex: index }),
    }).catch(() => {});
    router.push("/dashboard");
  }

  async function finish() {
    setLeaving(true);
    if (persistTimer.current) clearTimeout(persistTimer.current);
    await fetch(`/api/sessions/${sessionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers, currentIndex: index, status: "completed" }),
    }).catch(() => {});
    router.replace(`/results/${sessionId}`);
  }

  return (
    <div>
      {/* Session header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">
            Practice session
          </p>
          <p className="font-display text-lg font-semibold text-navy-900">
            {subject.name}
            <span className="ml-2 text-sm font-normal text-ink-soft">{session.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-soft">
            Score {correctSoFar}/{answeredCount}
          </span>
          <button
            type="button"
            disabled={leaving}
            onClick={() => void pause()}
            className="rounded border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
          >
            Pause &amp; save
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_220px]">
        {/* Question card */}
        <div className="rounded-lg border border-line bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-3">
            <span className="pt-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Question {index + 1} of {questions.length} · {q.chapterName}
            </span>
            <QuestionActions
              questionId={q.id}
              saved={savedIds.has(q.id)}
              onSavedChange={handleSavedChange}
            />
          </div>
          <div className="px-6 py-6">
            <p className="text-base font-medium leading-relaxed text-ink whitespace-pre-line">
              {q.text}
            </p>
            {q.imageId && <QuestionImage imageId={q.imageId} />}
            <div className="mt-6 space-y-3">
              {options.map((o) => {
                let style = "border-line bg-white hover:border-navy-700 hover:bg-navy-50";
                if (answered) {
                  if (o.key === q.correct) style = "border-emerald-600 bg-emerald-50";
                  else if (o.key === picked) style = "border-red-500 bg-red-50";
                  else style = "border-line bg-white opacity-60";
                }
                return (
                  <button
                    key={o.key}
                    type="button"
                    disabled={answered}
                    onClick={() => choose(o.key)}
                    className={`flex w-full items-start gap-3 rounded border px-4 py-3 text-left text-sm transition-colors ${style}`}
                  >
                    <span className="font-display mt-px font-semibold text-navy-800">
                      {o.key}.
                    </span>
                    <span className="whitespace-pre-line">{o.text}</span>
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className={`mt-6 rounded border-l-4 p-4 ${
                  isCorrect ? "border-emerald-600 bg-emerald-50" : "border-red-500 bg-red-50"
                }`}
              >
                <p className="text-sm font-semibold text-ink">
                  {isCorrect ? "Correct." : `Incorrect — the answer is ${q.correct}.`}
                </p>
                {q.explanation && (
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft whitespace-pre-line">
                    {q.explanation}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between border-t border-line px-6 py-4">
            <button
              type="button"
              disabled={index === 0}
              onClick={() => go(index - 1)}
              className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Previous
            </button>
            {index + 1 < questions.length ? (
              <button
                type="button"
                onClick={() => go(index + 1)}
                className="rounded bg-navy-900 px-6 py-2 text-sm font-semibold text-white hover:bg-navy-800"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                disabled={leaving}
                onClick={() => void finish()}
                className="rounded bg-gold-500 px-6 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
              >
                Finish session
              </button>
            )}
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
              const state =
                a === undefined ? "blank" : a === item.correct ? "correct" : "wrong";
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
                  onClick={() => go(i)}
                  className={`h-8 rounded text-xs font-semibold transition-colors ${color} ${
                    isCurrent ? "ring-2 ring-gold-500 ring-offset-1" : ""
                  }`}
                  aria-label={`Question ${i + 1}${
                    state === "blank" ? "" : state === "correct" ? ", correct" : ", incorrect"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-xs text-ink-soft">
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-emerald-700" /> Correct
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm bg-red-600" /> Incorrect
            </p>
            <p className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm border border-line bg-white" /> Not
              answered
            </p>
          </div>
          <button
            type="button"
            disabled={leaving}
            onClick={() => void finish()}
            className="mt-4 w-full rounded bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400 disabled:opacity-50"
          >
            Finish session
          </button>
        </div>
      </div>
    </div>
  );
}
