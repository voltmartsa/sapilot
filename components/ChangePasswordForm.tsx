"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNote(null);
    if (newPassword !== confirmPassword) {
      setError("The new passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Your password could not be changed.");
        return;
      }
      setNote("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-line bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-semibold text-navy-900">Change password</h2>
      <div className="mt-4 space-y-3">
        <div>
          <label htmlFor="current-password" className="block text-sm font-semibold text-ink">
            Current password
          </label>
          <input
            id="current-password"
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold text-ink">
            New password
          </label>
          <input
            id="new-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
          <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold text-ink">
            Confirm new password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
        </div>
      </div>
      {error && (
        <p className="mt-3 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      )}
      {note && <p className="mt-3 text-sm font-semibold text-emerald-700">{note}</p>}
      <button
        type="submit"
        disabled={busy}
        className="mt-4 rounded bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-50"
      >
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}
