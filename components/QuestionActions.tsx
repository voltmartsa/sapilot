"use client";

import { useState } from "react";

export default function QuestionActions({
  questionId,
  saved,
  onSavedChange,
}: {
  questionId: number;
  saved: boolean;
  onSavedChange: (questionId: number, saved: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);

  async function toggleSave() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/student/saved", {
        method: saved ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      if (res.status === 401) {
        setNote("Sign in to save questions.");
        return;
      }
      if (!res.ok) {
        setNote("Could not update your saved questions.");
        return;
      }
      onSavedChange(questionId, !saved);
    } catch {
      setNote("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function submitReport() {
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/student/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, reason }),
      });
      const data = await res.json();
      if (res.status === 401) {
        setNote("Sign in to report questions.");
        return;
      }
      if (!res.ok) {
        setNote(data.error ?? "The report could not be submitted.");
        return;
      }
      setReporting(false);
      setReason("");
      setNote("Reported — an instructor will review this question.");
    } catch {
      setNote("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => void toggleSave()}
          title={saved ? "Remove from saved questions" : "Save to review later"}
          className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
            saved
              ? "border-gold-500 bg-gold-500/15 text-gold-600"
              : "border-line text-ink-soft hover:border-gold-500 hover:text-gold-600"
          }`}
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5">
            <path d="M4 2.5h8a.5.5 0 01.5.5v10.6a.3.3 0 01-.48.24L8 11l-4.02 2.84a.3.3 0 01-.48-.24V3a.5.5 0 01.5-.5z" strokeLinejoin="round" />
          </svg>
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setReporting((r) => !r);
            setNote(null);
          }}
          title="Report a problem with this question"
          className="inline-flex items-center gap-1.5 rounded border border-line px-2.5 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3.5 14V2.5m0 0h8.6a.3.3 0 01.24.48L10.5 5.75l1.84 2.77a.3.3 0 01-.24.48H3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Report
        </button>
      </div>

      {reporting && (
        <div className="mt-3 rounded border border-line bg-paper/70 p-3 text-left">
          <label
            htmlFor={`report-${questionId}`}
            className="block text-xs font-semibold text-ink"
          >
            What is wrong with this question?
          </label>
          <textarea
            id={`report-${questionId}`}
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. the marked answer is incorrect, a typo, an outdated regulation…"
            className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setReporting(false)}
              className="rounded px-3 py-1.5 text-xs font-semibold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy || reason.trim().length < 5}
              onClick={() => void submitReport()}
              className="rounded bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Submit report
            </button>
          </div>
        </div>
      )}

      {note && <p className="mt-2 text-xs font-medium text-ink-soft">{note}</p>}
    </div>
  );
}
