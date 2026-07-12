"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";

type QuestionRow = {
  id: number;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correct: string;
  explanation: string;
  imageId: number | null;
  chapterId: number;
  chapterName: string;
  subjectId: number;
  subjectName: string;
};
type SubjectRow = { id: number; name: string; chapters: { id: number; name: string; questionCount: number }[] };
type QualGroup = { id: number; shortName: string; subjects: SubjectRow[] };

export default function AdminQuestionBankPage() {
  const { headers } = useAdmin();
  const [tree, setTree] = useState<QualGroup[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [chapterId, setChapterId] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [editing, setEditing] = useState<QuestionRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/subjects", { headers })
      .then((r) => r.json())
      .then((d) => setTree((d.qualifications ?? []) as QualGroup[]))
      .catch(() => {});
  }, [headers]);

  const load = useCallback(
    (targetPage: number) => {
      const p = new URLSearchParams({ page: String(targetPage) });
      if (subjectId) p.set("subjectId", subjectId);
      if (chapterId) p.set("chapterId", chapterId);
      if (search.trim()) p.set("search", search.trim());
      setRows(null);
      fetch(`/api/admin/questionbank?${p.toString()}`, { headers })
        .then((r) => r.json())
        .then((d) => {
          setRows((d.questions ?? []) as QuestionRow[]);
          setTotal(d.total ?? 0);
          setPageSize(d.pageSize ?? 20);
          setPage(d.page ?? targetPage);
          setSelected(new Set());
        })
        .catch(() => setRows([]));
    },
    [headers, subjectId, chapterId, search],
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId, chapterId]);

  const subjects = tree.flatMap((g) =>
    g.subjects.map((s) => ({ ...s, qualShort: g.shortName })),
  );
  const chaptersForSubject =
    subjects.find((s) => String(s.id) === subjectId)?.chapters ?? [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function toggleRow(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function deleteQuestions(target: { questionIds?: number[]; chapterId?: number }, confirmText: string) {
    if (!window.confirm(confirmText)) return;
    setBusy(true);
    setNote(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/questionbank", {
        method: "DELETE",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The delete failed.");
        return;
      }
      setNote(`${data.deleted} question${data.deleted === 1 ? "" : "s"} deleted.`);
      load(1);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/questionbank", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(editing),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The question could not be saved.");
        return;
      }
      setNote(`Question #${editing.id} updated.`);
      setEditing(null);
      load(page);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Question bank</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Filter, edit and delete questions. Select several for a bulk delete, or clear an
        entire chapter at once.
      </p>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
        <label className="text-sm">
          <span className="block text-xs font-semibold text-ink">Subject</span>
          <select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              setChapterId("");
            }}
            className="mt-1 rounded border border-line bg-white px-3 py-2 text-sm"
          >
            <option value="">All subjects</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.qualShort} · {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs font-semibold text-ink">Chapter</span>
          <select
            value={chapterId}
            onChange={(e) => setChapterId(e.target.value)}
            disabled={!subjectId}
            className="mt-1 rounded border border-line bg-white px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">All chapters</option>
            {chaptersForSubject.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.questionCount})
              </option>
            ))}
          </select>
        </label>
        <label className="flex-1 text-sm">
          <span className="block text-xs font-semibold text-ink">Search question text</span>
          <div className="mt-1 flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(1)}
              placeholder="e.g. pressure altitude"
              className="w-full min-w-40 rounded border border-line bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => load(1)}
              className="rounded bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Search
            </button>
          </div>
        </label>
      </div>

      {/* Bulk actions */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-soft">
          {total.toLocaleString("en-ZA")} question{total === 1 ? "" : "s"}
          {selected.size > 0 && ` · ${selected.size} selected`}
        </span>
        <button
          type="button"
          disabled={busy || selected.size === 0}
          onClick={() =>
            void deleteQuestions(
              { questionIds: Array.from(selected) },
              `Delete ${selected.size} selected question${selected.size === 1 ? "" : "s"}? This cannot be undone.`,
            )
          }
          className="rounded border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          Delete selected
        </button>
        {chapterId && (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void deleteQuestions(
                { chapterId: Number(chapterId) },
                "Delete EVERY question in this chapter? This cannot be undone.",
              )
            }
            className="rounded border border-red-400 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Delete whole chapter&apos;s questions
          </button>
        )}
        {note && <span className="text-sm font-semibold text-emerald-700">{note}</span>}
        {error && <span className="text-sm font-semibold text-red-600">{error}</span>}
      </div>

      {/* List */}
      <div className="mt-4 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {rows === null ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-soft">
            No questions match these filters.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((q) => (
              <li key={q.id} className="flex items-start gap-3 px-4 py-3.5">
                <input
                  type="checkbox"
                  checked={selected.has(q.id)}
                  onChange={() => toggleRow(q.id)}
                  className="mt-1 h-4 w-4 accent-[#a87f1f]"
                  aria-label={`Select question ${q.id}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink line-clamp-2">{q.text}</p>
                  <p className="mt-1 text-xs text-ink-soft">
                    #{q.id} · {q.subjectName} · {q.chapterName} · answer {q.correct}
                    {q.imageId && " · 📷 photo"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing({ ...q })}
                    className="rounded border border-navy-800 px-3 py-1 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void deleteQuestions(
                        { questionIds: [q.id] },
                        "Delete this question? This cannot be undone.",
                      )
                    }
                    className="rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="rounded border border-navy-800 px-4 py-1.5 font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-30"
          >
            Previous
          </button>
          <span className="text-ink-soft">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="rounded border border-navy-800 px-4 py-1.5 font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-30"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy-950/60 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-navy-900">
              Edit question #{editing.id}
            </h3>
            <div className="mt-4 space-y-3">
              <textarea
                rows={3}
                value={editing.text}
                onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                className="w-full rounded border border-line px-3 py-2 text-sm"
                aria-label="Question text"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                {(["optionA", "optionB", "optionC", "optionD"] as const).map((f, i) => (
                  <label key={f} className="text-xs font-semibold text-ink">
                    Option {"ABCD"[i]}
                    <input
                      type="text"
                      value={editing[f] ?? ""}
                      onChange={(e) => setEditing({ ...editing, [f]: e.target.value })}
                      className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                    />
                  </label>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                Correct answer
                <select
                  value={editing.correct}
                  onChange={(e) => setEditing({ ...editing, correct: e.target.value })}
                  className="rounded border border-line px-3 py-1.5 text-sm"
                >
                  {["A", "B", "C", "D"].map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold text-ink">
                Explanation
                <textarea
                  rows={3}
                  value={editing.explanation}
                  onChange={(e) => setEditing({ ...editing, explanation: e.target.value })}
                  className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
                />
              </label>
            </div>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveEdit()}
                className="rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save question"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
