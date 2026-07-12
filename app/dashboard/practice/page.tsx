"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboard } from "@/components/dashboard/DashboardShell";
import DualRangeSlider from "@/components/DualRangeSlider";
import ChapterSelect from "@/components/ChapterSelect";

type ChapterRow = { id: number; name: string; questionCount: number };

export default function DashboardPracticePage() {
  const router = useRouter();
  const { activeSubjectId, activeSubject, loaded } = useDashboard();
  const [chapters, setChapters] = useState<ChapterRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [range, setRange] = useState<{ start: number; end: number }>({ start: 1, end: 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    setChapters(null);
    setError(null);
    fetch(`/api/student/chapters?subjectId=${activeSubjectId}`)
      .then((r) => r.json())
      .then((d: { chapters?: ChapterRow[] }) => {
        if (cancelled) return;
        const ch = d.chapters ?? [];
        setChapters(ch);
        setSelectedId(ch[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setChapters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  const selectedChapter = useMemo(
    () => (chapters ?? []).find((c) => c.id === selectedId) ?? null,
    [chapters, selectedId],
  );
  const totalAvailable = selectedChapter?.questionCount ?? 0;

  // Reset the slider to the full chapter whenever the chapter changes.
  useEffect(() => {
    setRange({ start: 1, end: Math.max(1, totalAvailable) });
  }, [selectedId, totalAvailable]);

  async function start() {
    if (!activeSubjectId || !selectedId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "practice",
          subjectId: activeSubjectId,
          chapterIds: [selectedId],
          rangeStart: range.start,
          rangeEnd: range.end,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The session could not be started.");
        setBusy(false);
        return;
      }
      router.push(`/practice/session/${data.session.id}`);
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  if (loaded && !activeSubjectId) {
    return (
      <p className="text-sm text-ink-soft">
        Subscribe to a qualification in Settings to start practising.
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Practice</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Pick one chapter of {activeSubject?.name ?? "…"}, then use the slider to choose
        exactly which questions to practise.
      </p>

      {chapters === null ? (
        <p className="mt-6 text-sm text-ink-soft">Loading chapters…</p>
      ) : chapters.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-ink-soft">
            No questions have been published for this subject yet.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          {/* Chapter picker */}
          <div className="rounded-lg border border-line bg-white p-5 shadow-sm">
            <h2 className="font-display text-base font-semibold text-navy-900">
              Chapter
            </h2>
            <p className="mt-1 text-xs text-ink-soft">
              One chapter per session — select the one you are revising.
            </p>
            <div className="mt-4 max-h-96 overflow-y-auto pr-1">
              <ChapterSelect
                chapters={chapters}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>

          {/* Range + start */}
          <div className="rounded-lg border-2 border-navy-900 bg-white p-6 shadow-sm lg:self-start">
            <h2 className="font-display text-base font-semibold text-navy-900">
              Question range
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              {selectedChapter
                ? `${selectedChapter.name} has ${totalAvailable} question${totalAvailable === 1 ? "" : "s"} — slide to choose where to start and end.`
                : "Select a chapter to set a range."}
            </p>
            <div className="mt-5">
              <DualRangeSlider
                max={Math.max(1, totalAvailable)}
                start={range.start}
                end={range.end}
                onChange={(start, end) => setRange({ start, end })}
              />
            </div>
            {error && (
              <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={busy || !selectedId || totalAvailable === 0}
              onClick={() => void start()}
              className="mt-5 w-full rounded bg-gold-500 px-5 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy
                ? "Starting…"
                : `Start practice (${Math.max(0, range.end - range.start + 1)} questions)`}
            </button>
            <p className="mt-3 text-xs text-ink-soft">
              You can pause at any time — the session will wait on your dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
