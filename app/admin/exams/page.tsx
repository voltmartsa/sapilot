"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdmin } from "@/components/admin/AdminShell";

type SubjectRow = {
  id: number;
  name: string;
  examQuestions: number;
  examMinutes: number;
  passMark: number;
};
type QualGroup = { id: number; shortName: string; name: string; subjects: SubjectRow[] };

export default function AdminExamsPage() {
  const { headers } = useAdmin();
  const [groups, setGroups] = useState<QualGroup[] | null>(null);
  const [drafts, setDrafts] = useState<Record<number, SubjectRow>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/admin/subjects", { headers })
      .then((r) => r.json())
      .then((d) => {
        const qs = (d.qualifications ?? []) as QualGroup[];
        setGroups(qs);
        const map: Record<number, SubjectRow> = {};
        qs.forEach((g) => g.subjects.forEach((s) => (map[s.id] = { ...s })));
        setDrafts(map);
      })
      .catch(() => setGroups([]));
  }, [headers]);

  useEffect(() => {
    load();
  }, [load]);

  function setField(id: number, field: "examQuestions" | "examMinutes" | "passMark", value: string) {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: Number(value) },
    }));
  }

  async function save(id: number) {
    const d = drafts[id];
    setBusyId(id);
    setNote(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: id,
          examQuestions: d.examQuestions,
          examMinutes: d.examMinutes,
          passMark: d.passMark,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The exam settings could not be saved.");
        return;
      }
      setNote(`Saved exam settings for ${d.name}.`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Exams</h1>
      <p className="mt-1 text-sm text-ink-soft">
        The default number of questions and time allowed for each subject&apos;s mock
        examination, and its pass mark. Shorter student-chosen papers scale the time
        proportionally.
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
              <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-white shadow-sm">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-xs uppercase tracking-wider text-ink-soft">
                      <th className="px-4 py-3 font-semibold">Subject</th>
                      <th className="px-4 py-3 font-semibold">Questions</th>
                      <th className="px-4 py-3 font-semibold">Minutes</th>
                      <th className="px-4 py-3 font-semibold">Pass mark %</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {g.subjects.map((s) => {
                      const d = drafts[s.id] ?? s;
                      return (
                        <tr key={s.id}>
                          <td className="px-4 py-2.5 font-medium text-ink">{s.name}</td>
                          {(["examQuestions", "examMinutes", "passMark"] as const).map(
                            (field) => (
                              <td key={field} className="px-4 py-2.5">
                                <input
                                  type="number"
                                  min={1}
                                  max={field === "passMark" ? 100 : 500}
                                  value={d[field]}
                                  onChange={(e) => setField(s.id, field, e.target.value)}
                                  className="w-20 rounded border border-line bg-white px-2 py-1.5 text-sm"
                                />
                              </td>
                            ),
                          )}
                          <td className="px-4 py-2.5 text-right">
                            <button
                              type="button"
                              disabled={busyId === s.id}
                              onClick={() => void save(s.id)}
                              className="rounded bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
                            >
                              {busyId === s.id ? "Saving…" : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
