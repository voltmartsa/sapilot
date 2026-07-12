"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";

type ChapterRow = { id: number; name: string; questionCount: number };
type SubjectRow = {
  id: number;
  name: string;
  description: string;
  chapters: ChapterRow[];
};
type QualGroup = { id: number; shortName: string; name: string; subjects: SubjectRow[] };

export default function AdminSubjectsPage() {
  const { headers, passcode } = useAdmin();
  const [groups, setGroups] = useState<QualGroup[] | null>(null);
  const [editingSubject, setEditingSubject] = useState<SubjectRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/subjects", { headers })
      .then((r) => r.json())
      .then((d) => setGroups((d.qualifications ?? []) as QualGroup[]))
      .catch(() => setGroups([]));
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveSubject() {
    if (!editingSubject) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: editingSubject.id,
          name: editingSubject.name,
          description: editingSubject.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The subject could not be saved.");
        return;
      }
      setNote(`Saved ${editingSubject.name}.`);
      setEditingSubject(null);
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function renameChapter(chapter: ChapterRow) {
    const name = window.prompt("New chapter name:", chapter.name);
    if (!name || name.trim() === chapter.name) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: chapter.id, name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The chapter could not be renamed.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteChapter(chapter: ChapterRow) {
    if (
      !window.confirm(
        `Delete "${chapter.name}" and its ${chapter.questionCount} questions? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/chapter", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, chapterId: chapter.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The chapter could not be deleted.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        Subjects &amp; categories
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        The qualification categories and their subjects and chapters. Exam settings are
        managed on the Exams page; questions on the Question bank page.
      </p>
      {note && <p className="mt-4 text-sm font-semibold text-emerald-700">{note}</p>}
      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {groups === null ? (
        <p className="mt-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="mt-6 space-y-8">
          {groups.map((g) => (
            <div key={g.id}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-600">
                {g.shortName} — {g.name}
              </h2>
              <div className="mt-2 space-y-3">
                {g.subjects.map((s) => (
                  <details
                    key={s.id}
                    className="rounded-lg border border-line bg-white shadow-sm"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-3 px-5 py-3.5">
                      <span>
                        <span className="text-sm font-semibold text-ink">{s.name}</span>
                        <span className="ml-2 text-xs text-ink-soft">
                          {s.chapters.length} chapter{s.chapters.length === 1 ? "" : "s"} ·{" "}
                          {s.chapters.reduce((n, c) => n + c.questionCount, 0)} questions
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setEditingSubject({ ...s });
                        }}
                        className="rounded border border-navy-800 px-3 py-1 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                      >
                        Edit subject
                      </button>
                    </summary>
                    <div className="border-t border-line px-5 py-3">
                      <p className="text-xs text-ink-soft">{s.description}</p>
                      {s.chapters.length === 0 ? (
                        <p className="mt-3 text-sm text-ink-soft">No chapters yet.</p>
                      ) : (
                        <ul className="mt-3 divide-y divide-line">
                          {s.chapters.map((c) => (
                            <li
                              key={c.id}
                              className="flex items-center justify-between gap-3 py-2 text-sm"
                            >
                              <span className="text-ink">
                                {c.name}{" "}
                                <span className="text-xs text-ink-soft">
                                  ({c.questionCount})
                                </span>
                              </span>
                              <span className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void renameChapter(c)}
                                  className="rounded border border-navy-800 px-2.5 py-1 text-xs font-semibold text-navy-800 hover:bg-navy-50"
                                >
                                  Rename
                                </button>
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => void deleteChapter(c)}
                                  className="rounded border border-red-400 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                                >
                                  Delete
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit subject modal */}
      {editingSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-semibold text-navy-900">
              Edit subject
            </h3>
            <label className="mt-4 block text-xs font-semibold text-ink">
              Name
              <input
                type="text"
                value={editingSubject.name}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, name: e.target.value })
                }
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold text-ink">
              Description
              <textarea
                rows={3}
                value={editingSubject.description}
                onChange={(e) =>
                  setEditingSubject({ ...editingSubject, description: e.target.value })
                }
                className="mt-1 w-full rounded border border-line px-3 py-2 text-sm font-normal"
              />
            </label>
            {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setEditingSubject(null)}
                className="rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void saveSubject()}
                className="rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save subject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
