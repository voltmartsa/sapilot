import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { manualLogbookEntries } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_ROLE = new Set(["dual", "solo", "pic"]);
const VALID_DAY_NIGHT = new Set(["day", "night"]);

type ParsedEntry = {
  flightDate: Date;
  aircraftType: string;
  registration: string;
  picName: string;
  route: string;
  dayNight: string;
  landings: number;
  instrumentHours: number | null;
  hours: number;
  role: string;
  notes: string;
};

function parseEntryBody(body: unknown): { error: string; values: null } | { error: null; values: ParsedEntry } {
  const b = body as Record<string, unknown> | null;
  const flightDate = new Date(String(b?.flightDate ?? ""));
  const aircraftType = String(b?.aircraftType ?? "").trim();
  const registration = String(b?.registration ?? "").trim().toUpperCase();
  const picName = String(b?.picName ?? "").trim();
  const route = String(b?.route ?? "").trim();
  const dayNight = String(b?.dayNight ?? "day");
  const landings = Number(b?.landings);
  const instrumentHoursRaw = b?.instrumentHours;
  const hours = Number(b?.hours);
  const role = String(b?.role ?? "dual");
  const notes = String(b?.notes ?? "").trim();

  if (Number.isNaN(flightDate.getTime())) return { error: "Enter a valid flight date.", values: null };
  if (!aircraftType) return { error: "Enter the aircraft type.", values: null };
  if (!picName) return { error: "Enter the PIC's name.", values: null };
  if (!VALID_DAY_NIGHT.has(dayNight)) return { error: "Select day or night.", values: null };
  if (!Number.isInteger(landings) || landings < 0 || landings > 20) {
    return { error: "Enter a valid number of landings.", values: null };
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return { error: "Enter a valid number of hours (up to 24).", values: null };
  }
  if (!VALID_ROLE.has(role)) return { error: "Invalid role.", values: null };

  let instrumentHours: number | null = null;
  if (instrumentHoursRaw !== undefined && instrumentHoursRaw !== null && instrumentHoursRaw !== "") {
    instrumentHours = Number(instrumentHoursRaw);
    if (!Number.isFinite(instrumentHours) || instrumentHours < 0 || instrumentHours > hours) {
      return { error: "Instrument time must be a valid number, no greater than total hours.", values: null };
    }
  }

  return {
    error: null,
    values: {
      flightDate,
      aircraftType,
      registration,
      picName,
      route,
      dayNight,
      landings,
      instrumentHours,
      hours,
      role,
      notes,
    },
  };
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const rows = await db
    .select()
    .from(manualLogbookEntries)
    .where(eq(manualLogbookEntries.userId, user.id))
    .orderBy(desc(manualLogbookEntries.flightDate));
  return NextResponse.json({ entries: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = parseEntryBody(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const [created] = await db
    .insert(manualLogbookEntries)
    .values({ userId: user.id, ...parsed.values })
    .returning();
  return NextResponse.json({ entry: created });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number((body as Record<string, unknown> | null)?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const parsed = parseEntryBody(body);
  if (parsed.error !== null) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = await db
    .update(manualLogbookEntries)
    .set(parsed.values)
    .where(and(eq(manualLogbookEntries.id, id), eq(manualLogbookEntries.userId, user.id)))
    .returning();
  if (updated.length === 0) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  return NextResponse.json({ entry: updated[0] });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const deleted = await db
    .delete(manualLogbookEntries)
    .where(and(eq(manualLogbookEntries.id, id), eq(manualLogbookEntries.userId, user.id)))
    .returning({ id: manualLogbookEntries.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
