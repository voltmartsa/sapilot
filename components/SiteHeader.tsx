"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = { id: number; email: string; name: string; role: string } | null;

function homeFor(role: string): string {
  if (role === "super_admin") return "/admin";
  if (role === "instructor") return "/instructor";
  if (role === "school_admin") return "/school";
  return "/dashboard";
}

export function Roundel({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M20 6 L22.4 17.6 L34 20 L22.4 22.4 L20 34 L17.6 22.4 L6 20 L17.6 17.6 Z"
        fill="currentColor"
      />
      <circle cx="20" cy="20" r="2.2" fill="var(--color-gold-500)" />
    </svg>
  );
}

export default function SiteHeader() {
  const router = useRouter();
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setMe(d.user ?? null);
          setLoaded(true);
        }
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  async function signOut() {
    setMenuOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-900 text-white shadow-sm">
      <div className="h-0.5 bg-gold-500" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-gold-400">
            <Roundel />
          </span>
          <span className="font-display text-lg font-semibold tracking-wide">
            SA PILOT
          </span>
        </Link>

        {!loaded ? (
          <span className="h-8 w-24" aria-hidden="true" />
        ) : me ? (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-navy-100/90 transition-colors hover:bg-navy-800 hover:text-white"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-950">
                {me.name.trim().charAt(0).toUpperCase()}
              </span>
              Profile
              <svg
                viewBox="0 0 16 16"
                className={`h-3 w-3 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white text-ink shadow-xl"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="truncate text-sm font-semibold text-navy-900">{me.name}</p>
                  <p className="truncate text-xs text-ink-soft">{me.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href={homeFor(me.role)}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-ink transition-colors hover:bg-navy-50"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={`${homeFor(me.role)}/settings`}
                    role="menuitem"
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-2 text-sm text-ink transition-colors hover:bg-navy-50"
                  >
                    Settings
                  </Link>
                </div>
                <div className="border-t border-line py-1">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => void signOut()}
                    className="block w-full px-4 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                  >
                    Log out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <nav className="flex items-center gap-1">
            <Link
              href="/#qualifications"
              className="rounded px-3 py-2 text-sm font-medium text-navy-100/90 transition-colors hover:bg-navy-800 hover:text-white"
            >
              Subscriptions
            </Link>
            <Link
              href="/login"
              className="rounded bg-gold-500 px-3 py-1.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
            >
              Sign In / Sign Up
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
