"use client";

import { useEffect, useState } from "react";

export default function QuestionImage({ imageId }: { imageId: number }) {
  const [open, setOpen] = useState(false);
  const src = `/api/images/${imageId}`;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative mt-4 inline-block cursor-zoom-in rounded border border-line bg-white p-1 text-left shadow-sm transition-shadow hover:shadow-md"
        aria-label="Enlarge question image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Question figure"
          className="max-h-72 w-auto max-w-full rounded-sm"
        />
        <span className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-1.5 rounded bg-navy-950/75 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
          <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6">
            <circle cx="7" cy="7" r="4.5" />
            <path d="M10.5 10.5L14 14M7 5v4M5 7h4" strokeLinecap="round" />
          </svg>
          Click to enlarge
        </span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[60] flex cursor-zoom-out items-center justify-center bg-navy-950/85 p-4 sm:p-8"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged question image"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="Question figure, enlarged"
            className="max-h-full max-w-full rounded bg-white p-1 shadow-2xl"
          />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/25"
            aria-label="Close enlarged image"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
