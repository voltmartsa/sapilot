"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
  const [me, setMe] = useState<Me>(null);
  const [loaded, setLoaded] = useState(false);

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
          <Link
            href={homeFor(me.role)}
            className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-navy-100/90 transition-colors hover:bg-navy-800 hover:text-white"
            title={me.email}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-950">
              {me.name.trim().charAt(0).toUpperCase()}
            </span>
            Profile
          </Link>
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
