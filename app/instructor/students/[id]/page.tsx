"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { StudentReport } from "@/lib/reports";

function csvEscape(value: string | number | Date | null): string {
  const s = value === null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(report: StudentReport) {
  const lines: string[] = [];
  lines.push(`Report for,${csvEscape(report.student.name)},${csvEscape(report.student.email)}`);
  lines.push("");
  lines.push("Subject,Correct,Answered,Accuracy %,Sessions,Exams,Best exam %");
  for (const s of report.subjectStats) {
    lines.push(
      [s.subjectName, s.correct, s.answered, s.accuracy, s.sessions, s.exams, s.bestExamPct]
        .map(csvEscape)
        .join(","),
    );
  }
  lines.push("");
  lines.push("Weak chapter,Subject,Accuracy %,Correct,Wrong,Unanswered");
  for (const c of report.weakChapters) {
    lines.push(
      [c.chapterName, c.subjectName, c.accuracy, c.correct, c.wrong, c.unanswered]
        .map(csvEscape)
        .join(","),
    );
  }
  lines.push("");
  lines.push("Recent session,Subject,Kind,Score,Date");
  for (const r of report.recentSessions) {
    lines.push(
      [r.label, r.subjectName, r.kind, `${r.correct}/${r.total}`, r.completedAt ?? ""]
        .map(csvEscape)
        .join(","),
    );
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.student.name.replace(/\s+/g, "-").toLowerCase()}-report.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function InstructorStudentReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/instructor/students/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) {
          setError(data.error ?? "The report could not be loaded.");
          return;
        }
        setReport(data.report as StudentReport);
      })
      .catch(() => setError("The report could not be loaded."));
  }, [id]);

  if (error) {
    return (
      <div className="rounded-lg border border-line bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-ink-soft">{error}</p>
        <Link href="/instructor" className="mt-5 inline-block rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800">
          Back to my students
        </Link>
      </div>
    );
  }
  if (!report) {
    return <p className="text-sm text-ink-soft">Loading report…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/instructor" className="text-sm font-semibold text-navy-800 hover:text-gold-600">
          ← Back to my students
        </Link>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => downloadCsv(report)}
            className="rounded border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
          >
            Download CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      <div className="mt-6 border-b border-line pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
          Student performance report
        </p>
        <h1 className="font-display mt-1 text-3xl font-semibold text-navy-900">
          {report.student.name}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          {report.student.email}
          {report.student.baseAirport && ` · Base: ${report.student.baseAirport}`}
        </p>
        <p className="mt-1 text-xs text-ink-soft">
          Studying: {report.subscriptions.map((s) => s.qualificationName).join(", ") || "—"}
        </p>
        <p className="mt-3 text-xs text-ink-soft">
          Generated {new Date().toLocaleString("en-ZA")}
        </p>
      </div>

      {/* Headline stats */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-line bg-white p-5 text-center shadow-sm">
          <p className="font-display text-3xl font-semibold text-navy-900">
            {report.overallAccuracy === null ? "—" : `${report.overallAccuracy}%`}
          </p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink-soft">Overall accuracy</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5 text-center shadow-sm">
          <p className="font-display text-3xl font-semibold text-navy-900">{report.totalAnswered}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink-soft">Questions answered</p>
        </div>
        <div className="rounded-lg border border-line bg-white p-5 text-center shadow-sm">
          <p className="font-display text-3xl font-semibold text-navy-900">{report.totalExams}</p>
          <p className="mt-1 text-xs uppercase tracking-wider text-ink-soft">Mock exams sat</p>
        </div>
      </div>

      {/* Insights */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">
          Where to focus — and how to help
        </h2>
        {report.insights.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No guidance available yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {report.insights.map((line, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded border-l-4 border-gold-500 bg-paper px-4 py-3 text-sm text-ink">
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Subject breakdown */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">Subject breakdown</h2>
        {report.subjectStats.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No activity recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="px-4 py-2.5 font-semibold">Subject</th>
                  <th className="px-4 py-2.5 font-semibold">Accuracy</th>
                  <th className="px-4 py-2.5 font-semibold">Sessions</th>
                  <th className="px-4 py-2.5 font-semibold">Exams</th>
                  <th className="px-4 py-2.5 font-semibold">Best exam</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.subjectStats.map((s) => (
                  <tr key={s.subjectId}>
                    <td className="px-4 py-2.5 font-medium text-ink">{s.subjectName}</td>
                    <td className="px-4 py-2.5">{s.accuracy}%</td>
                    <td className="px-4 py-2.5">{s.sessions}</td>
                    <td className="px-4 py-2.5">{s.exams}</td>
                    <td className="px-4 py-2.5">
                      {s.exams > 0 ? `${s.bestExamPct}% (pass ${s.passMark}%)` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Weak chapters */}
      <div className="mt-8">
        <h2 className="font-display text-lg font-semibold text-navy-900">Weakest chapters</h2>
        {report.weakChapters.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No weak chapters identified.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="px-4 py-2.5 font-semibold">Chapter</th>
                  <th className="px-4 py-2.5 font-semibold">Subject</th>
                  <th className="px-4 py-2.5 font-semibold">Accuracy</th>
                  <th className="px-4 py-2.5 font-semibold">Correct / Wrong / Unanswered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.weakChapters.map((c) => (
                  <tr key={c.chapterId}>
                    <td className="px-4 py-2.5 font-medium text-ink">{c.chapterName}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{c.subjectName}</td>
                    <td className="px-4 py-2.5">
                      <span className={c.accuracy < 50 ? "font-semibold text-red-600" : "font-semibold text-gold-700"}>
                        {c.accuracy}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-ink-soft">
                      {c.correct} / {c.wrong} / {c.unanswered}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent sessions */}
      <div className="mt-8 mb-4">
        <h2 className="font-display text-lg font-semibold text-navy-900">Recent sessions</h2>
        {report.recentSessions.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">No sessions recorded yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                  <th className="px-4 py-2.5 font-semibold">Session</th>
                  <th className="px-4 py-2.5 font-semibold">Subject</th>
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-4 py-2.5 font-semibold">Score</th>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {report.recentSessions.map((r, i) => (
                  <tr key={i}>
                    <td className="px-4 py-2.5 text-ink">{r.label || "—"}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{r.subjectName}</td>
                    <td className="px-4 py-2.5 capitalize text-ink-soft">{r.kind}</td>
                    <td className="px-4 py-2.5 font-medium text-ink">
                      {r.correct}/{r.total}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-soft">
                      {r.completedAt
                        ? new Date(r.completedAt).toLocaleDateString("en-ZA", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
