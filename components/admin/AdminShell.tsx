"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/**
 * Legacy context kept so admin pages/components that were built around the old
 * shared-passcode flow (and still pass `headers` into their fetch calls) keep
 * working unchanged. Auth is now a real session cookie sent automatically with
 * every same-origin request, so there's nothing meaningful to put in `headers`
 * — it's an empty object, present only for backward compatibility.
 */
type AdminContextValue = {
  passcode: string;
  headers: HeadersInit;
};

const AdminContext = createContext<AdminContextValue>({ passcode: "", headers: {} });

export function useAdmin() {
  return useContext(AdminContext);
}

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/exams", label: "Exams" },
  { href: "/admin/flagged", label: "Flagged questions" },
  { href: "/admin/questionbank", label: "Question bank" },
  { href: "/admin/upload", label: "Upload" },
  { href: "/admin/resources", label: "Resources" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/subjects", label: "Subjects" },
  { href: "/admin/schools", label: "Schools" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <AdminContext.Provider value={{ passcode: "", headers: {} }}>
      <div className="mx-auto flex max-w-7xl gap-0 px-0 sm:px-4 lg:px-6">
        <aside className="hidden w-56 shrink-0 border-r border-line py-8 pr-4 md:block">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
            Super admin
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
            onClick={() => void signOut()}
            className="mt-6 px-3 text-xs font-semibold text-ink-soft hover:text-red-600"
          >
            Sign out
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
            <button
              type="button"
              onClick={() => void signOut()}
              className="whitespace-nowrap rounded px-3 py-2 text-sm font-medium text-ink-soft hover:bg-navy-50 hover:text-red-600"
            >
              Sign out
            </button>
          </nav>
          <div className="px-4 sm:px-0">{children}</div>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
