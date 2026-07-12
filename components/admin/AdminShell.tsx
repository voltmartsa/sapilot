"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type AdminContextValue = {
  passcode: string;
  headers: HeadersInit;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used inside AdminShell");
  return ctx;
}

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/exams", label: "Exams" },
  { href: "/admin/flagged", label: "Flagged questions" },
  { href: "/admin/questionbank", label: "Question bank" },
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subjects", label: "Subjects" },
] as const;

const STORAGE_KEY = "sapilot-admin-passcode";

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [passcode, setPasscode] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Verify the stored passcode quietly.
      fetch("/api/admin/stats", { headers: { "x-admin-passcode": saved } })
        .then((r) => {
          if (r.ok) setPasscode(saved);
          else window.localStorage.removeItem(STORAGE_KEY);
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-passcode": input },
      });
      if (!res.ok) {
        setError("Incorrect passcode.");
        return;
      }
      window.localStorage.setItem(STORAGE_KEY, input);
      setPasscode(input);
    } catch {
      setError("Could not reach the server.");
    }
  }

  if (checking) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-ink-soft">
        Opening the instructor portal…
      </div>
    );
  }

  if (!passcode) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 sm:px-6">
        <form
          onSubmit={unlock}
          className="rounded-lg border border-line bg-white p-8 shadow-sm"
        >
          <h1 className="font-display text-2xl font-semibold text-navy-900">
            Instructor portal
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            Enter the instructor passcode to manage the question bank, exams and users.
          </p>
          <input
            type="password"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Instructor passcode"
            className="mt-5 w-full rounded border border-line bg-white px-3 py-2.5 text-sm focus:border-navy-700 focus:outline-none"
          />
          {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}
          <button
            type="submit"
            className="mt-5 w-full rounded bg-navy-900 px-5 py-3 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Unlock
          </button>
        </form>
      </div>
    );
  }

  return (
    <AdminContext.Provider
      value={{ passcode, headers: { "x-admin-passcode": passcode } }}
    >
      <div className="mx-auto flex max-w-7xl gap-0 px-0 sm:px-4 lg:px-6">
        <aside className="hidden w-56 shrink-0 border-r border-line py-8 pr-4 md:block">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
            Instructor portal
          </p>
          <nav className="mt-3 space-y-1">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-navy-900 text-white"
                      : "text-ink hover:bg-navy-50 hover:text-navy-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(STORAGE_KEY);
              setPasscode(null);
              setInput("");
            }}
            className="mt-6 px-3 text-xs font-semibold text-ink-soft hover:text-red-600"
          >
            Lock portal
          </button>
        </aside>

        <div className="min-w-0 flex-1 py-8 md:pl-8">
          <nav className="mb-6 flex gap-1 overflow-x-auto px-4 sm:px-0 md:hidden">
            {NAV.map((item) => {
              const active =
                item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded px-3 py-2 text-sm font-medium ${
                    active ? "bg-navy-900 text-white" : "text-ink hover:bg-navy-50"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-4 sm:px-0">{children}</div>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
