"use client";

import { useCallback, useEffect, useState } from "react";
import GroundSchoolList, { type GroundSchoolItem } from "@/components/GroundSchoolList";
import { getCalendarRange, navigateAnchor } from "@/components/BookingCalendar";

export default function SchoolGroundschoolPage() {
  const [view, setView] = useState<"day" | "week">("week");
  const [anchorDate, setAnchorDate] = useState(new Date());
  const [sessions, setSessions] = useState<GroundSchoolItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const { from, to } = getCalendarRange(view, anchorDate);
    fetch(`/api/school/groundschool?from=${from.toISOString()}&to=${to.toISOString()}`)
      .then((r) => r.json())
      .then((d) => setSessions((d.sessions ?? []) as GroundSchoolItem[]))
      .catch(() => setSessions([]));
  }, [view, anchorDate]);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: number) {
    if (!window.confirm("Delete this groundschool session?")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/school/groundschool", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "The session could not be deleted.");
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
      <h1 className="font-display text-2xl font-semibold text-navy-900">Groundschool</h1>
      <p className="mt-1 text-sm text-ink-soft">
        All groundschool sessions scheduled by your instructors.
      </p>

      {error && (
        <p className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}

      <div className="mt-6">
        <GroundSchoolList
          view={view}
          anchorDate={anchorDate}
          sessions={sessions}
          onNavigate={(dir) => setAnchorDate((d) => navigateAnchor(view, d, dir))}
          onViewChange={setView}
          onSessionClick={(s) => void remove(s.id)}
          showInstructor
        />
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        Click a session to delete it{busy ? "…" : "."}
      </p>
    </div>
  );
}
