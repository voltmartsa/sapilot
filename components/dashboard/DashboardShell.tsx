"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export type SubjectGroup = {
  qualificationId: number;
  shortName: string;
  name: string;
  subjects: { id: number; name: string; questionCount: number }[];
};

type DashboardContextValue = {
  groups: SubjectGroup[];
  loaded: boolean;
  activeSubjectId: number | null;
  setActiveSubjectId: (id: number) => void;
  activeSubject: { id: number; name: string; questionCount: number } | null;
  activeQualification: SubjectGroup | null;
};

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used inside DashboardShell");
  return ctx;
}

type NavItem = { href: string; label: string; icon: string; schoolOnly?: boolean };

const NAV: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "M3 10.5L10 4l7 6.5M5 9v7h10V9",
  },
  {
    href: "/dashboard/practice",
    label: "Practice",
    icon: "M6 3h8a1 1 0 011 1v12a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1zm2 4h4M8 10h4M8 13h2",
  },
  {
    href: "/dashboard/exams",
    label: "Exams",
    icon: "M10 2a8 8 0 108 8 8 8 0 00-8-8zm0 3v5l3 2",
  },
  {
    href: "/dashboard/flights",
    label: "Flights",
    icon: "M2 11l16-6-4 6 4 6-16-6zm0 0h9",
    schoolOnly: true,
  },
  {
    href: "/dashboard/tools",
    label: "Tools",
    icon: "M12.5 3.5a3 3 0 00-4 4L3 13v3h3l5.5-5.5a3 3 0 004-4L13 9l-2-2z",
  },
  {
    href: "/dashboard/saved",
    label: "Saved questions",
    icon: "M6 2.5h8a.5.5 0 01.5.5v13.4a.3.3 0 01-.48.24L10 13l-4.02 3.64a.3.3 0 01-.48-.24V3a.5.5 0 01.5-.5z",
  },
  {
    href: "/dashboard/social",
    label: "Social",
    icon: "M7 9.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM14 9.5a2 2 0 100-4 2 2 0 000 4zM2.5 16c.3-2.6 2.2-4.5 4.5-4.5s4.2 1.9 4.5 4.5M11.8 12c1.9.3 3.4 1.9 3.7 4",
  },
  {
    href: "/dashboard/settings",
    label: "Settings",
    icon: "M10 6.5a3.5 3.5 0 103.5 3.5A3.5 3.5 0 0010 6.5zm7 3.5l-1.6-.4a5.6 5.6 0 00-.5-1.2l.9-1.4-1.8-1.8-1.4.9a5.6 5.6 0 00-1.2-.5L11 4H9l-.4 1.6a5.6 5.6 0 00-1.2.5L6 5.2 4.2 7l.9 1.4a5.6 5.6 0 00-.5 1.2L3 10l1.6.4a5.6 5.6 0 00.5 1.2l-.9 1.4L6 14.8l1.4-.9a5.6 5.6 0 001.2.5L9 16h2l.4-1.6a5.6 5.6 0 001.2-.5l1.4.9 1.8-1.8-.9-1.4a5.6 5.6 0 00.5-1.2z",
  },
];

const STORAGE_KEY = "sapilot-active-subject";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [groups, setGroups] = useState<SubjectGroup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeSubjectId, setActiveSubjectIdState] = useState<number | null>(null);
  const [hasSchool, setHasSchool] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setHasSchool(!!d.user?.schoolId);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const navItems = useMemo(() => NAV.filter((item) => !item.schoolOnly || hasSchool), [hasSchool]);

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  useEffect(() => {
    let cancelled = false;
    fetch("/api/student/subjects")
      .then((r) => r.json())
      .then((d: { groups?: SubjectGroup[] }) => {
        if (cancelled) return;
        const g = d.groups ?? [];
        setGroups(g);
        const all = g.flatMap((x) => x.subjects);
        const stored = Number(window.localStorage.getItem(STORAGE_KEY));
        const initial = all.some((s) => s.id === stored) ? stored : all[0]?.id ?? null;
        setActiveSubjectIdState(initial);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<DashboardContextValue>(() => {
    const activeQualification =
      groups.find((g) => g.subjects.some((s) => s.id === activeSubjectId)) ?? null;
    const activeSubject =
      activeQualification?.subjects.find((s) => s.id === activeSubjectId) ?? null;
    return {
      groups,
      loaded,
      activeSubjectId,
      setActiveSubjectId: (id: number) => {
        window.localStorage.setItem(STORAGE_KEY, String(id));
        setActiveSubjectIdState(id);
      },
      activeSubject,
      activeQualification,
    };
  }, [groups, loaded, activeSubjectId]);

  return (
    <DashboardContext.Provider value={value}>
      <div className="mx-auto flex max-w-7xl gap-0 px-0 sm:px-4 lg:px-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-line py-8 pr-4 md:block">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-navy-900 text-white"
                      : "text-ink hover:bg-navy-50 hover:text-navy-900"
                  }`}
                >
                  <svg
                    viewBox="0 0 20 20"
                    className={`h-4.5 w-4.5 shrink-0 ${active ? "text-gold-400" : "text-ink-soft"}`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ width: 18, height: 18 }}
                  >
                    <path d={item.icon} />
                  </svg>
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
          {/* Subject switcher — prominent so the active subject is always obvious */}
          <div className="mb-6 rounded-lg border-2 border-navy-900 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-600">
                  Working in
                </p>
                {value.activeSubject ? (
                  <p className="font-display truncate text-xl font-semibold text-navy-900">
                    {value.activeQualification?.shortName} · {value.activeSubject.name}
                  </p>
                ) : (
                  <p className="font-display text-xl font-semibold text-ink-soft">
                    {loaded ? "No subscription yet" : "Loading…"}
                  </p>
                )}
              </div>
              {groups.length > 0 ? (
                <label className="flex items-center gap-2 text-sm">
                  <span className="text-ink-soft">Switch subject</span>
                  <select
                    value={activeSubjectId ?? ""}
                    onChange={(e) => value.setActiveSubjectId(Number(e.target.value))}
                    className="max-w-64 rounded border border-line bg-white px-3 py-2 text-sm font-medium"
                  >
                    {groups.map((g) => (
                      <optgroup key={g.qualificationId} label={`${g.shortName} — ${g.name}`}>
                        {g.subjects.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.questionCount})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </label>
              ) : (
                loaded && (
                  <Link
                    href="/dashboard/settings"
                    className="rounded bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 hover:bg-gold-400"
                  >
                    Subscribe to a qualification
                  </Link>
                )
              )}
            </div>
          </div>

          {/* Mobile nav */}
          <nav className="mb-6 flex gap-1 overflow-x-auto md:hidden">
            {navItems.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
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
    </DashboardContext.Provider>
  );
}
