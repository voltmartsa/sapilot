"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [baseAirport, setBaseAirport] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const safeNext = next.startsWith("/") ? next : "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? { name, email, password, baseAirport }
            : { email, password },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      router.push(safeNext);
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-line bg-white p-8 shadow-sm"
    >
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        {mode === "signup" ? "Create your student account" : "Sign in"}
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        {mode === "signup"
          ? "One account for all your question banks, saved questions and mock exam practice."
          : "Welcome back. Sign in to continue your preparation."}
      </p>

      <div className="mt-6 space-y-4">
        {mode === "signup" && (
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-ink">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
            />
          </div>
        )}
        {mode === "signup" && (
          <div>
            <label htmlFor="baseAirport" className="block text-sm font-semibold text-ink">
              Base airport (ICAO)
            </label>
            <input
              id="baseAirport"
              type="text"
              required
              maxLength={4}
              value={baseAirport}
              onChange={(e) => setBaseAirport(e.target.value.toUpperCase())}
              placeholder="e.g. FALA"
              className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm uppercase tracking-widest focus:border-navy-700 focus:outline-none"
            />
            <p className="mt-1 text-xs text-ink-soft">
              The South African airfield you fly from, in the FA format — FALA
              (Lanseria), FACT (Cape Town), FAGG (George)…
            </p>
          </div>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-ink">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-semibold text-ink">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={mode === "signup" ? 8 : undefined}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded border border-line bg-white px-3 py-2 text-sm focus:border-navy-700 focus:outline-none"
          />
          {mode === "signup" && (
            <p className="mt-1 text-xs text-ink-soft">At least 8 characters.</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded border-l-4 border-red-500 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded bg-navy-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:cursor-wait disabled:opacity-50"
      >
        {busy
          ? "One moment…"
          : mode === "signup"
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="mt-5 text-center text-sm text-ink-soft">
        {mode === "signup" ? (
          <>
            Already registered?{" "}
            <Link
              href={`/login?next=${encodeURIComponent(safeNext)}`}
              className="font-semibold text-navy-800 hover:text-gold-600"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(safeNext)}`}
              className="font-semibold text-navy-800 hover:text-gold-600"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
