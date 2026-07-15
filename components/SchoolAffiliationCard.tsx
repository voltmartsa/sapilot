"use client";

import { useEffect, useState } from "react";

type SchoolOption = { id: number; name: string };
type Affiliation = {
  schoolId: number | null;
  schoolName: string | null;
  shareWithSchool: boolean;
  instructorId: number | null;
  instructorName: string | null;
};

export default function SchoolAffiliationCard() {
  const [data, setData] = useState<Affiliation | null>(null);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState("");
  const [shareOnJoin, setShareOnJoin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function load() {
    fetch("/api/student/affiliation")
      .then((r) => r.json())
      .then((d) => setData(d as Affiliation))
      .catch(() => {});
  }

  useEffect(() => {
    load();
    fetch("/api/schools")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.schools ?? []) as SchoolOption[];
        setSchools(list);
        if (list.length > 0) setSelectedSchoolId(String(list[0].id));
      })
      .catch(() => {});
  }, []);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await fetch("/api/student/affiliation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: Number(selectedSchoolId), shareWithSchool: shareOnJoin }),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? "The affiliation could not be saved.");
        return;
      }
      setNote("You are now affiliated with this school.");
      // Full reload so the sidebar's Flights tab (gated on affiliation) appears.
      window.location.reload();
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  async function toggleShare() {
    if (!data) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/student/affiliation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareWithSchool: !data.shareWithSchool }),
      });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error ?? "Could not update sharing.");
        return;
      }
      load();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (!window.confirm("Leave this school? Your instructor assignment will be cleared and this can be undone by re-affiliating later.")) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/student/affiliation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId: null }),
      });
      if (!res.ok) {
        const result = await res.json();
        setError(result.error ?? "Could not leave the school.");
        return;
      }
      // Full reload so the sidebar's Flights tab (gated on affiliation) disappears.
      window.location.reload();
    } catch {
      setError("Could not reach the server.");
      setBusy(false);
    }
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy-900">School affiliation</h2>
        <p className="mt-2 text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-navy-900">School affiliation</h2>

      {error && (
        <p className="mt-3 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}
      {note && <p className="mt-3 text-sm font-semibold text-emerald-700">{note}</p>}

      {data.schoolId ? (
        <div className="mt-4">
          <p className="text-sm text-ink-soft">You are affiliated with</p>
          <p className="font-display text-xl font-semibold text-navy-900">{data.schoolName}</p>
          <p className="mt-2 text-sm text-ink-soft">
            {data.instructorName ? `Assigned instructor: ${data.instructorName}` : "Not yet assigned to an instructor."}
          </p>

          <div className="mt-4 flex items-start justify-between gap-4 rounded border border-line bg-paper/50 p-4">
            <div>
              <p className="text-sm font-semibold text-ink">Share study progress</p>
              <p className="mt-1 text-xs text-ink-soft">
                When on, your accuracy, exam scores and weak chapters are visible to this
                school and your assigned instructor. Your name and email are always
                visible to the school regardless of this setting.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={data.shareWithSchool}
              disabled={busy}
              onClick={() => void toggleShare()}
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
                data.shareWithSchool ? "bg-gold-500" : "bg-navy-100"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  data.shareWithSchool ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void leave()}
            className="mt-4 rounded border border-red-400 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            Leave this school
          </button>
        </div>
      ) : schools.length === 0 ? (
        <p className="mt-3 text-sm text-ink-soft">
          No schools have been registered yet. You&apos;re studying independently.
        </p>
      ) : (
        <form onSubmit={join} className="mt-4 space-y-3">
          <p className="text-sm text-ink-soft">
            You&apos;re currently studying independently. Affiliate with a school if
            you&apos;re training with one.
          </p>
          <label className="block text-xs font-semibold text-ink">
            School
            <select
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm font-normal"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <span className="mt-1 block font-normal text-ink-soft">
              Your name and email will be visible to this school&apos;s administrators
              so they can assign you to an instructor.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={shareOnJoin}
              onChange={(e) => setShareOnJoin(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#a87f1f]"
            />
            <span>
              Share my study progress and exam results with this school and my
              assigned instructor.
            </span>
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
          >
            {busy ? "Joining…" : "Affiliate with this school"}
          </button>
        </form>
      )}
    </div>
  );
}
