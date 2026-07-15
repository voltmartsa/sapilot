"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type AdminChapter = { id: number; name: string; questionCount: number };
type AdminSubject = { id: number; name: string; chapters: AdminChapter[] };
type AdminQualification = {
  id: number;
  name: string;
  shortName: string;
  subjects: AdminSubject[];
};

type UploadResult = {
  inserted: number;
  totalRows: number;
  errors: { row: number; message: string }[];
  chapter: { id: number; name: string };
  subject: { id: number; name: string };
};

const EMPTY_MANUAL = {
  text: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correct: "A",
  explanation: "",
};

export default function AdminUpload({ tree }: { tree: AdminQualification[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"excel" | "manual">("excel");
  const [qualId, setQualId] = useState<string>(String(tree[0]?.id ?? ""));
  const [subjectId, setSubjectId] = useState<string>("");
  const [chapterMode, setChapterMode] = useState<"existing" | "new">("new");
  const [chapterId, setChapterId] = useState<string>("");
  const [newChapterName, setNewChapterName] = useState("");
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [manualSuccess, setManualSuccess] = useState<string | null>(null);

  const qualification = useMemo(
    () => tree.find((q) => String(q.id) === qualId),
    [tree, qualId],
  );
  const subjects = qualification?.subjects ?? [];
  const subject = subjects.find((s) => String(s.id) === subjectId);
  const chaptersAvailable = subject?.chapters ?? [];

  useEffect(() => {
    setSubjectId(String(subjects[0]?.id ?? ""));
  }, [qualId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (chaptersAvailable.length === 0) {
      setChapterMode("new");
      setChapterId("");
    } else {
      setChapterId(String(chaptersAvailable[0].id));
    }
  }, [subjectId]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPhoto(file: File | undefined) {
    setPhotoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "manual") {
      await submitManual();
      return;
    }
    setError(null);
    setResult(null);
    setManualSuccess(null);

    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose an Excel file to upload.");
      return;
    }
    if (chapterMode === "new" && !newChapterName.trim()) {
      setError("Enter a name for the new chapter.");
      return;
    }

    const form = new FormData();
    form.set("subjectId", subjectId);
    if (chapterMode === "existing") form.set("chapterId", chapterId);
    else form.set("newChapterName", newChapterName.trim());
    form.set("file", file);

    setBusy(true);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed.");
        return;
      }
      setResult(data as UploadResult);
      setNewChapterName("");
      if (fileRef.current) fileRef.current.value = "";
      setFileName("");
      router.refresh();
    } catch {
      setError("The upload could not be completed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function submitManual() {
    setError(null);
    setResult(null);
    setManualSuccess(null);

    if (!manual.text.trim()) {
      setError("Enter the question text.");
      return;
    }
    if (!manual.optionA.trim() || !manual.optionB.trim()) {
      setError("Options A and B are both required.");
      return;
    }
    const filled: Record<string, string> = {
      A: manual.optionA.trim(),
      B: manual.optionB.trim(),
      C: manual.optionC.trim(),
      D: manual.optionD.trim(),
    };
    if (!filled[manual.correct]) {
      setError(`Option ${manual.correct} is marked correct but has no text.`);
      return;
    }
    if (chapterMode === "new" && !newChapterName.trim()) {
      setError("Enter a name for the new chapter.");
      return;
    }

    const form = new FormData();
    form.set("subjectId", subjectId);
    if (chapterMode === "existing") form.set("chapterId", chapterId);
    else form.set("newChapterName", newChapterName.trim());
    form.set("text", manual.text.trim());
    form.set("optionA", manual.optionA.trim());
    form.set("optionB", manual.optionB.trim());
    form.set("optionC", manual.optionC.trim());
    form.set("optionD", manual.optionD.trim());
    form.set("correct", manual.correct);
    form.set("explanation", manual.explanation.trim());
    const photo = photoRef.current?.files?.[0];
    if (photo) form.set("photo", photo);

    setBusy(true);
    try {
      const res = await fetch("/api/admin/question", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The question could not be created.");
        return;
      }
      setManualSuccess(
        `Question added to “${data.chapter.name}” in ${data.subject.name}${
          data.question.imageId ? " with its photo" : ""
        }.`,
      );
      setManual((m) => ({ ...EMPTY_MANUAL, correct: m.correct }));
      if (photoRef.current) photoRef.current.value = "";
      setPhoto(undefined);
      router.refresh();
    } catch {
      setError("The question could not be created. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteChapter(id: number, name: string) {
    if (
      !window.confirm(
        `Delete "${name}" and every question in it? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/admin/chapter", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId: id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The chapter could not be deleted.");
        return;
      }
      router.refresh();
    } catch {
      setError("The chapter could not be deleted. Check your connection and try again.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-line bg-white shadow-sm"
      >
        <div className="border-b border-line px-6 pt-4">
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Add questions to the bank
          </h2>
          <div className="mt-3 flex gap-1">
            {(
              [
                ["excel", "Bulk upload (Excel)"],
                ["manual", "Create a question"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setMode(value);
                  setError(null);
                }}
                className={`rounded-t border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${
                  mode === value
                    ? "border-gold-500 text-navy-900"
                    : "border-transparent text-ink-soft hover:text-navy-800"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-6 px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="qual" className="block text-sm font-semibold text-ink">
                Qualification
              </label>
              <select
                id="qual"
                value={qualId}
                onChange={(e) => setQualId(e.target.value)}
                className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm"
              >
                {tree.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.shortName} — {q.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-semibold text-ink">
                Subject
              </label>
              <select
                id="subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Target chapter</legend>
            <div className="mt-2 space-y-3">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="chapterMode"
                  checked={chapterMode === "new"}
                  onChange={() => setChapterMode("new")}
                  className="accent-[#a87f1f]"
                />
                Create a new chapter
              </label>
              {chapterMode === "new" && (
                <input
                  type="text"
                  value={newChapterName}
                  onChange={(e) => setNewChapterName(e.target.value)}
                  placeholder='e.g. "Chapter 3 — Altimetry"'
                  className="ml-6 w-full max-w-md rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                />
              )}
              <label
                className={`flex items-center gap-2 text-sm ${
                  chaptersAvailable.length === 0 ? "text-ink-soft/50" : "text-ink"
                }`}
              >
                <input
                  type="radio"
                  name="chapterMode"
                  disabled={chaptersAvailable.length === 0}
                  checked={chapterMode === "existing"}
                  onChange={() => setChapterMode("existing")}
                  className="accent-[#a87f1f]"
                />
                Add to an existing chapter
                {chaptersAvailable.length === 0 && " (none yet for this subject)"}
              </label>
              {chapterMode === "existing" && chaptersAvailable.length > 0 && (
                <select
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  className="ml-6 w-full max-w-md rounded border border-line bg-white px-3 py-2 text-sm"
                >
                  {chaptersAvailable.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.questionCount} questions)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </fieldset>

          {mode === "excel" ? (
            <div>
              <label htmlFor="file" className="block text-sm font-semibold text-ink">
                Excel workbook
              </label>
              <input
                id="file"
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="mt-1.5 block w-full max-w-md text-sm text-ink-soft file:mr-4 file:rounded file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
              />
              {fileName && (
                <p className="mt-1.5 text-xs text-ink-soft">Selected: {fileName}</p>
              )}
            </div>
          ) : (
            <div className="space-y-4 rounded border border-line bg-paper/60 p-4">
              <div>
                <label htmlFor="q-text" className="block text-sm font-semibold text-ink">
                  Question text
                </label>
                <textarea
                  id="q-text"
                  rows={3}
                  value={manual.text}
                  onChange={(e) => setManual((m) => ({ ...m, text: e.target.value }))}
                  className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                  placeholder="Type the full question…"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  [
                    ["optionA", "Option A", true],
                    ["optionB", "Option B", true],
                    ["optionC", "Option C", false],
                    ["optionD", "Option D", false],
                  ] as const
                ).map(([field, label, required]) => (
                  <div key={field}>
                    <label
                      htmlFor={`q-${field}`}
                      className="block text-sm font-semibold text-ink"
                    >
                      {label}
                      {!required && (
                        <span className="ml-1 font-normal text-ink-soft">(optional)</span>
                      )}
                    </label>
                    <input
                      id={`q-${field}`}
                      type="text"
                      value={manual[field]}
                      onChange={(e) =>
                        setManual((m) => ({ ...m, [field]: e.target.value }))
                      }
                      className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <label htmlFor="q-correct" className="text-sm font-semibold text-ink">
                  Correct answer
                </label>
                <select
                  id="q-correct"
                  value={manual.correct}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, correct: e.target.value }))
                  }
                  className="rounded border border-line bg-white px-3 py-1.5 text-sm"
                >
                  {["A", "B", "C", "D"].map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="q-explanation" className="block text-sm font-semibold text-ink">
                  Explanation
                </label>
                <textarea
                  id="q-explanation"
                  rows={3}
                  value={manual.explanation}
                  onChange={(e) =>
                    setManual((m) => ({ ...m, explanation: e.target.value }))
                  }
                  className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
                  placeholder="Why the correct answer is correct — shown to students after they answer."
                />
              </div>

              <div>
                <label htmlFor="q-photo" className="block text-sm font-semibold text-ink">
                  Photo <span className="font-normal text-ink-soft">(optional — chart, instrument, diagram…)</span>
                </label>
                <input
                  id="q-photo"
                  ref={photoRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/webp"
                  onChange={(e) => setPhoto(e.target.files?.[0])}
                  className="mt-1.5 block w-full max-w-md text-sm text-ink-soft file:mr-4 file:rounded file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
                />
                <p className="mt-1 text-xs text-ink-soft">
                  PNG, JPEG, GIF or WebP, up to 4 MB. Students can click the photo to
                  enlarge it.
                </p>
                {photoPreview && (
                  <div className="mt-3 inline-block rounded border border-line bg-white p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoPreview}
                      alt="Preview of the attached photo"
                      className="max-h-48 w-auto rounded-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {manualSuccess && (
            <div className="rounded border-l-4 border-emerald-600 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              {manualSuccess}
            </div>
          )}

          {error && (
            <div className="rounded border-l-4 border-red-500 bg-red-50 p-4 text-sm text-red-800">
              {error}
            </div>
          )}

          {result && mode === "excel" && (
            <div className="rounded border-l-4 border-emerald-600 bg-emerald-50 p-4">
              <p className="text-sm font-semibold text-emerald-900">
                {result.inserted} question{result.inserted === 1 ? "" : "s"} added to{" "}
                “{result.chapter.name}” in {result.subject.name}.
              </p>
              {result.errors.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-ink">
                    {result.errors.length} row{result.errors.length === 1 ? " was" : "s were"}{" "}
                    skipped:
                  </p>
                  <ul className="mt-1.5 max-h-48 space-y-1 overflow-y-auto text-xs text-ink-soft">
                    {result.errors.map((e, i) => (
                      <li key={i}>
                        Row {e.row}: {e.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="border-t border-line px-6 py-4">
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-gold-500 px-6 py-2.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400 disabled:cursor-wait disabled:opacity-50"
          >
            {busy
              ? mode === "excel"
                ? "Uploading…"
                : "Creating…"
              : mode === "excel"
                ? "Upload questions"
                : "Create question"}
          </button>
        </div>
      </form>

      <aside className="space-y-6">
        <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-navy-900">
            Workbook format
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            The first sheet must have a header row. Required columns:{" "}
            <strong>Question</strong>, <strong>Option A</strong>, <strong>Option B</strong>{" "}
            and <strong>Correct Answer</strong>. <strong>Option C</strong>,{" "}
            <strong>Option D</strong> and <strong>Explanation</strong> are optional but
            recommended.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-ink-soft">
            <li>• Correct Answer accepts a letter (A–D), a number (1–4), or the full option text.</li>
            <li>• Blank rows are ignored; invalid rows are skipped and reported with their row number.</li>
            <li>• .xlsx, .xls and .csv files are accepted, up to 10 MB.</li>
          </ul>
          <a
            href="/api/admin/template"
            className="mt-5 inline-block rounded border border-navy-800 px-4 py-2 text-sm font-semibold text-navy-800 transition-colors hover:bg-navy-900 hover:text-white"
          >
            Download Excel template
          </a>
        </div>

        <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-navy-900">
            Bank overview
          </h3>
          <p className="mt-1 text-xs text-ink-soft">
            Expand a subject to see its chapters. Deleting a chapter permanently removes
            all of its questions.
          </p>
          <div className="mt-4 max-h-96 space-y-4 overflow-y-auto pr-1">
            {tree.map((q) => (
              <div key={q.id}>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
                  {q.shortName}
                </p>
                <ul className="mt-1.5 space-y-1">
                  {q.subjects.map((s) => {
                    const total = s.chapters.reduce((n, c) => n + c.questionCount, 0);
                    return (
                      <li key={s.id} className="text-sm text-ink">
                        {s.chapters.length === 0 ? (
                          <div className="flex items-center justify-between py-0.5">
                            <span>{s.name}</span>
                            <span className="text-xs text-ink-soft">empty</span>
                          </div>
                        ) : (
                          <details>
                            <summary className="flex cursor-pointer items-center justify-between py-0.5 hover:text-navy-700">
                              <span>{s.name}</span>
                              <span className="text-xs text-ink-soft">
                                {s.chapters.length} ch · {total} q
                              </span>
                            </summary>
                            <ul className="mb-1 ml-3 mt-1 space-y-1 border-l border-line pl-3">
                              {s.chapters.map((c) => (
                                <li
                                  key={c.id}
                                  className="flex items-center justify-between gap-2 text-xs text-ink-soft"
                                >
                                  <span>
                                    {c.name} ({c.questionCount})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void deleteChapter(c.id, c.name)}
                                    className="shrink-0 rounded px-1.5 py-0.5 font-semibold text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </details>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}
