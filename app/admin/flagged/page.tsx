"use client";

import AdminReports from "@/components/AdminReports";

export default function AdminFlaggedPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        Flagged questions
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Questions students have reported as suspect, with their reasons.
      </p>
      <AdminReports />
    </div>
  );
}
