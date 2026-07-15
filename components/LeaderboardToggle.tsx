"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LeaderboardToggle({ initialOptIn }: { initialOptIn: boolean }) {
  const router = useRouter();
  const [optedIn, setOptedIn] = useState(initialOptIn);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !optedIn;
    setBusy(true);
    setOptedIn(next);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardOptIn: next }),
      });
      if (!res.ok) setOptedIn(!next);
      else router.refresh();
    } catch {
      setOptedIn(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            Leaderboard visibility
          </h2>
          <p className="mt-1.5 max-w-sm text-sm text-ink-soft">
            When on, your first name, correct-answer count, accuracy and session count
            appear on the weekly and monthly leaderboards for students subscribed to
            the same qualification. Your email and full name are never shown.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optedIn}
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
            optedIn ? "bg-gold-500" : "bg-navy-100"
          }`}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
              optedIn ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <p className="mt-3 text-xs font-semibold text-ink-soft">
        {optedIn ? "You are visible on the leaderboard." : "You are not visible to other students."}
      </p>
    </div>
  );
}
