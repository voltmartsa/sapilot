"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SchoolOption = { id: number; name: string };

function roleHome(role: string | undefined): string {
  if (role === "super_admin") return "/admin";
  if (role === "instructor") return "/instructor";
  if (role === "school_admin") return "/school";
  return "/dashboard";
}

export default function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "signup";
  next?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [baseAirport, setBaseAirport] = useState("");
  const [affiliation, setAffiliation] = useState<"independent" | "affiliated">("independent");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [shareWithSchool, setShareWithSchool] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "signup") return;
    fetch("/api/schools")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.schools ?? []) as SchoolOption[];
        setSchools(list);
        if (list.length > 0) setSchoolId(String(list[0].id));
      })
      .catch(() => {});
  }, [mode]);

  const explicitNext = next && next.startsWith("/") ? next : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const body =
        mode === "signup"
          ? {
              name,
              email,
              password,
              baseAirport,
              schoolId: affiliation === "affiliated" ? schoolId : null,
              shareWithSchool: affiliation === "affiliated" ? shareWithSchool : false,
            }
          : { email, password };
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      router.push(explicitNext ?? roleHome(data.user?.role));
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
            {mode === "login" ? "Email or username" : "Email address"}
          </label>
          <input
            id="email"
            type={mode === "login" ? "text" : "email"}
            required
            autoComplete="username"
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

        {mode === "signup" && schools.length > 0 && (
          <fieldset className="rounded border border-line bg-paper/50 p-4">
            <legend className="px-1 text-sm font-semibold text-ink">
              Are you studying with a flight school?
            </legend>
            <div className="mt-2 space-y-2">
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="affiliation"
                  checked={affiliation === "independent"}
                  onChange={() => setAffiliation("independent")}
                  className="accent-[#a87f1f]"
                />
                Independent student — studying on my own
              </label>
              <label className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="radio"
                  name="affiliation"
                  checked={affiliation === "affiliated"}
                  onChange={() => setAffiliation("affiliated")}
                  className="accent-[#a87f1f]"
                />
                Affiliated with a school
              </label>
            </div>

            {affiliation === "affiliated" && (
              <div className="mt-3 space-y-3 border-t border-line pt-3">
                <div>
                  <label htmlFor="schoolId" className="block text-xs font-semibold text-ink">
                    Your school
                  </label>
                  <select
                    id="schoolId"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="mt-1 w-full rounded border border-line bg-white px-3 py-2 text-sm"
                  >
                    {schools.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-ink-soft">
                    Your name and email will be visible to this school&apos;s
                    administrators so they can assign you to an instructor.
                  </p>
                </div>
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    checked={shareWithSchool}
                    onChange={(e) => setShareWithSchool(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#a87f1f]"
                  />
                  <span>
                    Share my study progress and exam results with this school and my
                    assigned instructor, so they can see where I&apos;m struggling and
                    help.
                  </span>
                </label>
              </div>
            )}
          </fieldset>
        )}
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
              href={`/login${explicitNext ? `?next=${encodeURIComponent(explicitNext)}` : ""}`}
              className="font-semibold text-navy-800 hover:text-gold-600"
            >
              Sign in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link
              href={`/signup${explicitNext ? `?next=${encodeURIComponent(explicitNext)}` : ""}`}
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
