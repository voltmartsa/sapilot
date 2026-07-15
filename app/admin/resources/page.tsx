"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";

type SubjectRow = { id: number; name: string };
type QualGroup = { id: number; shortName: string; subjects: SubjectRow[] };
type ResourceRow = {
  id: number;
  kind: "document" | "link";
  title: string;
  description: string;
  url: string | null;
  fileId: number | null;
  filename: string | null;
  mime: string | null;
  size: number | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminResourcesPage() {
  const { headers, passcode } = useAdmin();
  const [tree, setTree] = useState<QualGroup[]>([]);
  const [subjectId, setSubjectId] = useState("");
  const [resourceList, setResourceList] = useState<ResourceRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Link form
  const [linkTitle, setLinkTitle] = useState("");
  const [linkDescription, setLinkDescription] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  // Document form
  const [docTitle, setDocTitle] = useState("");
  const [docDescription, setDocDescription] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    fetch("/api/admin/subjects", { headers })
      .then((r) => r.json())
      .then((d) => {
        const qs = (d.qualifications ?? []) as QualGroup[];
        setTree(qs);
        const first = qs.flatMap((g) => g.subjects)[0];
        if (first) setSubjectId(String(first.id));
      })
      .catch(() => {});
  }, [headers]);

  const loadResources = useCallback(() => {
    if (!subjectId) return;
    setResourceList(null);
    fetch(`/api/admin/resources?subjectId=${subjectId}`, { headers })
      .then((r) => r.json())
      .then((d) => setResourceList((d.resources ?? []) as ResourceRow[]))
      .catch(() => setResourceList([]));
  }, [headers, subjectId]);

  useEffect(() => {
    loadResources();
  }, [loadResources]);

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.set("passcode", passcode);
      form.set("subjectId", subjectId);
      form.set("kind", "link");
      form.set("title", linkTitle);
      form.set("description", linkDescription);
      form.set("url", linkUrl);
      const res = await fetch("/api/admin/resources", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The link could not be added.");
        return;
      }
      setLinkTitle("");
      setLinkDescription("");
      setLinkUrl("");
      setNote("Link added.");
      loadResources();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function submitDocument(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const form = new FormData();
      form.set("passcode", passcode);
      form.set("subjectId", subjectId);
      form.set("kind", "document");
      form.set("title", docTitle || file.name);
      form.set("description", docDescription);
      form.set("file", file);
      const res = await fetch("/api/admin/resources", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The document could not be uploaded.");
        return;
      }
      setDocTitle("");
      setDocDescription("");
      if (fileRef.current) fileRef.current.value = "";
      setFileName("");
      setNote("Document uploaded.");
      loadResources();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteResource(id: number, title: string) {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/resources", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The resource could not be deleted.");
        return;
      }
      loadResources();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Resources</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload documents and add links to videos or learning materials, organised per
        subject. Students see these under their Tools tab.
      </p>

      <label className="mt-6 block max-w-md text-sm">
        <span className="font-semibold text-ink">Subject</span>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm"
        >
          {tree.map((g) => (
            <optgroup key={g.id} label={g.shortName}>
              {g.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>

      {note && <p className="mt-4 text-sm font-semibold text-emerald-700">{note}</p>}
      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitLink} className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy-900">
            Add a video or link
          </h2>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              required
              value={linkTitle}
              onChange={(e) => setLinkTitle(e.target.value)}
              placeholder="Title, e.g. &quot;VOR tracking explained&quot;"
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
            <input
              type="url"
              required
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://…"
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={linkDescription}
              onChange={(e) => setLinkDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add link"}
          </button>
        </form>

        <form onSubmit={submitDocument} className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-base font-semibold text-navy-900">
            Upload a document
          </h2>
          <div className="mt-4 space-y-3">
            <input
              type="text"
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="Title (defaults to filename)"
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
            <textarea
              rows={2}
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="Optional description"
              className="w-full rounded border border-line px-3 py-2 text-sm"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,image/png,image/jpeg"
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
              className="block w-full text-sm text-ink-soft file:mr-4 file:rounded file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
            />
            {fileName && <p className="text-xs text-ink-soft">Selected: {fileName}</p>}
            <p className="text-xs text-ink-soft">PDF, Word, PowerPoint, Excel, text or image — up to 15 MB.</p>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="mt-4 rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Upload document"}
          </button>
        </form>
      </div>

      <h2 className="font-display mt-8 text-lg font-semibold text-navy-900">
        Existing resources for this subject
      </h2>
      <div className="mt-3 overflow-hidden rounded-lg border border-line bg-white shadow-sm">
        {resourceList === null ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">Loading…</p>
        ) : resourceList.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-ink-soft">
            No resources added for this subject yet.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {resourceList.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3.5">
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    r.kind === "document" ? "bg-navy-100 text-navy-800" : "bg-gold-500/20 text-gold-700"
                  }`}
                >
                  {r.kind}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{r.title}</p>
                  <p className="truncate text-xs text-ink-soft">
                    {r.kind === "document"
                      ? `${r.filename} · ${r.size ? formatBytes(r.size) : ""}`
                      : r.url}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteResource(r.id, r.title)}
                  className="shrink-0 rounded border border-red-400 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
