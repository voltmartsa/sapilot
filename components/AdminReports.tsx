"use client";

import { useEffect, useState } from "react";

type ReportRow = {
  id: number;
  reason: string;
  status: string;
  createdAt: string;
  studentName: string;
  studentEmail: string;
  questionId: number;
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correct: string;
  explanation: string;
  imageId: number | null;
  chapterName: string;
  subjectName: string;
};

const statusStyle: Record<string, string> = {
  open: "bg-navy-100 text-navy-800",
  resolved: "bg-emerald-100 text-emerald-800",
  dismissed: "bg-red-100 text-red-700",
};

export default function AdminReports() {
  const [rows, setRows] = useState<ReportRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onlyOpen, setOnlyOpen] = useState(true);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function load() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The reports could not be loaded.");
        setRows(null);
        return;
      }
      setRows(data.reports as ReportRow[]);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function act(reportId: number, action: "resolve" | "dismiss" | "delete-question") {
    if (
      action === "delete-question" &&
      !window.confirm(
        "Delete the reported question from the bank? This cannot be undone.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The action failed.");
        return;
      }
      await load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const visible = (rows ?? []).filter((r) => (onlyOpen ? r.status === "open" : true));
  const openCount = (rows ?? []).filter((r) => r.status === "open").length;

  return (
    <div className="mt-12 rounded-lg border border-line bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Reported questions
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            Questions students have flagged as suspect. Resolve after correcting,
            dismiss if the report is unfounded, or delete the question outright.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {rows === null ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void load()}
              className="rounded border border-navy-800 px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
            >
              {busy ? "Loading…" : "Retry"}
            </button>
          ) : (
            <>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={onlyOpen}
                  onChange={(e) => setOnlyOpen(e.target.checked)}
                  className="h-4 w-4 accent-[#a87f1f]"
                />
                Open only ({openCount})
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void load()}
                className="rounded border border-navy-800 px-3 py-1.5 text-sm font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
              >
                Refresh
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mx-6 mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {rows !== null && (
        <div className="px-6 py-5">
          {visible.length === 0 ? (
            <p className="py-4 text-sm text-ink-soft">
              {onlyOpen
                ? "No open reports — the bank is clean."
                : "No reports have been submitted yet."}
            </p>
          ) : (
            <ul className="space-y-5">
              {visible.map((r) => (
                <li key={r.id} className="rounded border border-line">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-paper/60 px-4 py-2.5">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
                      {r.subjectName} · {r.chapterName}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${statusStyle[r.status] ?? statusStyle.open}`}
                    >
                      {r.status}
                    </span>
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-sm font-medium text-ink whitespace-pre-line">
                      {r.questionText}
                    </p>
                    {r.imageId && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={`/api/images/${r.imageId}`}
                        alt="Question figure"
                        className="mt-3 max-h-48 rounded border border-line"
                      />
                    )}
                    <dl className="mt-3 space-y-1 text-xs text-ink-soft">
                      {(
                        [
                          ["A", r.optionA],
                          ["B", r.optionB],
                          ["C", r.optionC],
                          ["D", r.optionD],
                        ] as const
                      )
                        .filter(([, v]) => v)
                        .map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <dt
                              className={`font-semibold ${k === r.correct ? "text-emerald-700" : ""}`}
                            >
                              {k}.{k === r.correct ? " ✓" : ""}
                            </dt>
                            <dd>{v}</dd>
                          </div>
                        ))}
                    </dl>
                    <div className="mt-3 rounded border-l-4 border-red-400 bg-red-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-red-700">
                        Report from {r.studentName} ({r.studentEmail})
                      </p>
                      <p className="mt-1 text-sm text-ink">{r.reason}</p>
                      <p className="mt-1 text-xs text-ink-soft">
                        {new Date(r.createdAt).toLocaleString("en-ZA")}
                      </p>
                    </div>
                    {r.status === "open" && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(r.id, "resolve")}
                          className="rounded bg-emerald-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50"
                        >
                          Mark resolved
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(r.id, "dismiss")}
                          className="rounded border border-navy-800 px-4 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(r.id, "delete-question")}
                          className="rounded border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Delete question
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
