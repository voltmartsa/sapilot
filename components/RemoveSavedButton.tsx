"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RemoveSavedButton({ questionId }: { questionId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await fetch("/api/student/saved", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void remove()}
      className="rounded border border-line px-3 py-1 text-xs font-semibold text-ink-soft transition-colors hover:border-red-400 hover:text-red-600 disabled:opacity-50"
    >
      {busy ? "Removing…" : "Remove"}
    </button>
  );
}
