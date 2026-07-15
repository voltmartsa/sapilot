"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Me = { id: number; email: string; name: string; role: string } | null;

function homeFor(role: string): string {
  if (role === "super_admin") return "/admin";
  if (role === "instructor") return "/instructor";
  if (role === "school_admin") return "/school";
  return "/dashboard";
}

export default function AccountMenu() {
  const router = useRouter();
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

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    setMe(null);
    router.push("/");
    router.refresh();
  }

  if (!loaded) {
    return <span className="w-20" aria-hidden="true" />;
  }

  if (!me) {
    return (
      <span className="flex items-center gap-1">
        <Link
          href="/login"
          className="rounded px-3 py-2 text-sm font-medium text-navy-100/90 transition-colors hover:bg-navy-800 hover:text-white"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded bg-gold-500 px-3 py-1.5 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
        >
          Create account
        </Link>
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <Link
        href={homeFor(me.role)}
        className="flex items-center gap-2 rounded px-3 py-2 text-sm font-medium text-navy-100/90 transition-colors hover:bg-navy-800 hover:text-white"
        title={me.email}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-500 text-xs font-bold text-navy-950">
          {me.name.trim().charAt(0).toUpperCase()}
        </span>
        {me.role === "super_admin"
          ? "Admin Portal"
          : me.role === "instructor"
            ? "My Students"
            : me.role === "school_admin"
              ? "School Portal"
              : "Dashboard"}
      </Link>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded px-2.5 py-2 text-sm text-navy-100/70 transition-colors hover:bg-navy-800 hover:text-white"
      >
        Sign out
      </button>
    </span>
  );
}
