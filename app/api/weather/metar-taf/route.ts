import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type MetarRow = {
  icaoId: string;
  name?: string;
  rawOb: string;
  obsTime: number; // unix seconds
  temp?: number;
  dewp?: number;
  wdir?: number | string;
  wspd?: number;
  visib?: number | string;
  altim?: number;
  wxString?: string | null;
  fltCat?: string; // VFR | MVFR | IFR | LIFR
};

type TafRow = {
  icaoId: string;
  name?: string;
  rawTAF: string;
  issueTime: string; // ISO
  validTimeFrom: number;
  validTimeTo: number;
};

async function fetchJson<T>(url: string): Promise<T[] | null> {
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const icao = (req.nextUrl.searchParams.get("icao") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(icao)) {
    return NextResponse.json({ error: "A valid 4-letter ICAO code is required." }, { status: 400 });
  }

  const [metarRows, tafRows] = await Promise.all([
    fetchJson<MetarRow>(`https://aviationweather.gov/api/data/metar?ids=${icao}&format=json`),
    fetchJson<TafRow>(`https://aviationweather.gov/api/data/taf?ids=${icao}&format=json`),
  ]);

  if (metarRows === null && tafRows === null) {
    return NextResponse.json(
      { error: "The weather service could not be reached. Try again shortly." },
      { status: 502 },
    );
  }

  const m = metarRows?.[0];
  const t = tafRows?.[0];

  return NextResponse.json({
    icao,
    stationName: m?.name ?? t?.name ?? null,
    metar: m
      ? {
          raw: m.rawOb,
          observedAt: new Date(m.obsTime * 1000).toISOString(),
          flightCategory: m.fltCat ?? null,
          tempC: m.temp ?? null,
          windDir: m.wdir ?? null,
          windKt: m.wspd ?? null,
          visibility: m.visib ?? null,
          altimHpa: m.altim ?? null,
          weather: m.wxString ?? null,
        }
      : null,
    taf: t
      ? {
          raw: t.rawTAF,
          issuedAt: t.issueTime,
          validFrom: new Date(t.validTimeFrom * 1000).toISOString(),
          validTo: new Date(t.validTimeTo * 1000).toISOString(),
        }
      : null,
  });
}
