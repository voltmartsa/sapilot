"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscribeButton({
  qualificationId,
  subscribed,
  shortName,
}: {
  qualificationId: number;
  subscribed: boolean;
  shortName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualificationId,
          action: subscribed ? "unsubscribe" : "subscribe",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void toggle()}
        className={`rounded px-5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-wait disabled:opacity-50 ${
          subscribed
            ? "border border-navy-800 text-navy-800 hover:bg-navy-50"
            : "bg-gold-500 text-navy-950 hover:bg-gold-400"
        }`}
      >
        {busy
          ? "One moment…"
          : subscribed
            ? `Unsubscribe from ${shortName}`
            : `Subscribe to ${shortName}`}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
