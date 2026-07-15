import { NextResponse } from "next/server";
import { and, desc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings, manualLogbookEntries, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const schoolRows = await db
    .select({
      id: flightBookings.id,
      aircraftRegistration: aircraft.registration,
      aircraftType: aircraft.type,
      instructorId: flightBookings.instructorId,
      startsAt: flightBookings.startsAt,
      purpose: flightBookings.purpose,
      hoursLogged: flightBookings.hoursLogged,
      hoursRole: flightBookings.hoursRole,
    })
    .from(flightBookings)
    .innerJoin(aircraft, eq(aircraft.id, flightBookings.aircraftId))
    .where(
      and(
        eq(flightBookings.studentId, user.id),
        eq(flightBookings.status, "confirmed"),
        isNotNull(flightBookings.hoursLogged),
      ),
    );

  const instructorIds = [...new Set(schoolRows.map((r) => r.instructorId))];
  const instructors = instructorIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, instructorIds))
    : [];
  const nameById = new Map(instructors.map((i) => [i.id, i.name]));

  const schoolEntries = schoolRows.map((r) => ({
    id: `school-${r.id}`,
    source: "school" as const,
    date: r.startsAt,
    aircraftType: r.aircraftType,
    registration: r.aircraftRegistration,
    picName: r.hoursRole === "pic" ? user.name : (nameById.get(r.instructorId) ?? "Unknown"),
    route: "",
    dayNight: null as string | null,
    landings: null as number | null,
    instrumentHours: null as number | null,
    hours: r.hoursLogged ?? 0,
    role: r.hoursRole ?? "dual",
    notes: r.purpose,
  }));

  const manualRows = await db
    .select()
    .from(manualLogbookEntries)
    .where(eq(manualLogbookEntries.userId, user.id));

  const manualEntries = manualRows.map((m) => ({
    id: `manual-${m.id}`,
    source: "manual" as const,
    date: m.flightDate,
    aircraftType: m.aircraftType,
    registration: m.registration,
    picName: m.picName,
    route: m.route,
    dayNight: m.dayNight,
    landings: m.landings,
    instrumentHours: m.instrumentHours,
    hours: m.hours,
    role: m.role,
    notes: m.notes,
  }));

  const entries = [...schoolEntries, ...manualEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const totals = entries.reduce(
    (acc, e) => {
      acc.total += e.hours;
      if (e.role === "solo") acc.solo += e.hours;
      else if (e.role === "pic") acc.pic += e.hours;
      else acc.dual += e.hours;
      acc.landings += e.landings ?? 0;
      acc.instrument += e.instrumentHours ?? 0;
      return acc;
    },
    { total: 0, dual: 0, solo: 0, pic: 0, landings: 0, instrument: 0 },
  );

  return NextResponse.json({ entries, totals });
}
