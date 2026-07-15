"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type WeatherData = {
  icao: string;
  stationName: string | null;
  metar: {
    raw: string;
    observedAt: string;
    flightCategory: string | null;
    tempC: number | null;
    windDir: number | string | null;
    windKt: number | null;
    visibility: number | string | null;
    altimHpa: number | null;
    weather: string | null;
  } | null;
  taf: {
    raw: string;
    issuedAt: string;
    validFrom: string;
    validTo: string;
  } | null;
};

const CATEGORY_STYLE: Record<string, string> = {
  VFR: "bg-emerald-600 text-white",
  MVFR: "bg-blue-600 text-white",
  IFR: "bg-red-600 text-white",
  LIFR: "bg-purple-600 text-white",
};

const STORAGE_KEY = "sapilot-tools-station";

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleString("en-ZA", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function MetarTafPanel({ baseAirport }: { baseAirport: string | null }) {
  const [icao, setIcao] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [input, setInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // On first mount, prefer a station the student previously chose on this
  // device; otherwise fall back to their base airport. This never touches
  // their saved profile — it's a Tools-only, local preference.
  useEffect(() => {
    const remembered = window.localStorage.getItem(STORAGE_KEY);
    const initial = remembered || baseAirport || "";
    setIcao(initial || null);
    setInput(initial);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(() => {
    if (!icao) return;
    setLoading(true);
    setError(null);
    fetch(`/api/weather/metar-taf?icao=${icao}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d as WeatherData);
      })
      .catch(() => setError("The weather service could not be reached."))
      .finally(() => setLoading(false));
  }, [icao]);

  useEffect(() => {
    if (initialized) load();
  }, [initialized, load]);

  function applyStation(e: React.FormEvent) {
    e.preventDefault();
    const code = input.trim().toUpperCase();
    if (!/^[A-Z]{4}$/.test(code)) {
      setInputError("Enter a 4-letter ICAO code, e.g. FALA.");
      return;
    }
    setInputError(null);
    setData(null);
    window.localStorage.setItem(STORAGE_KEY, code);
    setIcao(code);
    setInput(code);
  }

  function resetToBase() {
    if (!baseAirport) return;
    window.localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setIcao(baseAirport);
    setInput(baseAirport);
    setInputError(null);
  }

  const cat = data?.metar?.flightCategory;
  const stationForm = (
    <form onSubmit={applyStation} className="flex items-center gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value.toUpperCase())}
        maxLength={4}
        placeholder="ICAO"
        aria-label="Weather station ICAO code"
        className="w-24 rounded border border-line bg-white px-2.5 py-1.5 text-sm font-semibold uppercase tracking-widest focus:border-navy-700 focus:outline-none"
      />
      <button
        type="submit"
        className="rounded bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
      >
        View
      </button>
      {baseAirport && icao !== baseAirport && (
        <button
          type="button"
          onClick={resetToBase}
          className="text-xs font-semibold text-gold-600 hover:text-gold-500"
        >
          Use my base ({baseAirport})
        </button>
      )}
    </form>
  );

  if (!icao) {
    return (
      <div className="rounded-lg border-2 border-navy-900 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-semibold text-navy-900">
          Weather station
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          Enter any airport&apos;s ICAO code to see its live METAR and TAF here.
        </p>
        <div className="mt-3">{stationForm}</div>
        {inputError && <p className="mt-2 text-xs font-semibold text-red-600">{inputError}</p>}
        <p className="mt-4 text-xs text-ink-soft">
          Tip: set a base airport in{" "}
          <Link href="/dashboard/settings" className="font-semibold underline">
            Settings
          </Link>{" "}
          and it will be used here by default.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-navy-900 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-600">
            Weather station
          </p>
          <h2 className="font-display text-lg font-semibold text-navy-900">
            {icao}
            {data?.stationName && (
              <span className="ml-2 text-sm font-normal text-ink-soft">
                {data.stationName}
              </span>
            )}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {cat && (
            <span className={`rounded px-2.5 py-1 text-xs font-bold uppercase ${CATEGORY_STYLE[cat] ?? "bg-navy-100 text-navy-800"}`}>
              {cat}
            </span>
          )}
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="rounded border border-navy-800 px-3 py-1.5 text-xs font-semibold text-navy-800 hover:bg-navy-50 disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="border-b border-line px-6 py-3">
        {stationForm}
        {inputError && <p className="mt-2 text-xs font-semibold text-red-600">{inputError}</p>}
      </div>

      <div className="grid gap-px bg-line sm:grid-cols-2">
        <div className="bg-white px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">METAR</p>
          {error ? (
            <p className="mt-2 text-sm text-red-700">{error}</p>
          ) : data?.metar ? (
            <>
              <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink">
                {data.metar.raw}
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                Observed {relativeTime(data.metar.observedAt)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              {loading ? "Loading…" : "No current METAR available for this station."}
            </p>
          )}
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">TAF</p>
          {data?.taf ? (
            <>
              <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-ink">
                {data.taf.raw}
              </p>
              <p className="mt-2 text-xs text-ink-soft">
                Issued {relativeTime(data.taf.issuedAt)}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink-soft">
              {loading ? "Loading…" : "No current TAF available for this station."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
