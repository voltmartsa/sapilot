import { NextResponse } from "next/server";
import { and, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings, manualLogbookEntries, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  // Only flights where the instructor was actually aboard — dual instruction —
  // count toward their own hours. Solo/PIC-supervised student flights don't.
  const schoolRows = await db
    .select({
      id: flightBookings.id,
      aircraftRegistration: aircraft.registration,
      aircraftType: aircraft.type,
      studentId: flightBookings.studentId,
      startsAt: flightBookings.startsAt,
      hoursLogged: flightBookings.hoursLogged,
    })
    .from(flightBookings)
    .innerJoin(aircraft, eq(aircraft.id, flightBookings.aircraftId))
    .where(
      and(
        eq(flightBookings.instructorId, user.id),
        eq(flightBookings.status, "confirmed"),
        eq(flightBookings.hoursRole, "dual"),
        isNotNull(flightBookings.hoursLogged),
      ),
    );

  const studentIds = [...new Set(schoolRows.map((r) => r.studentId))];
  const students = studentIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, studentIds))
    : [];
  const studentNameById = new Map(students.map((s) => [s.id, s.name]));

  const schoolEntries = schoolRows.map((r) => ({
    id: `school-${r.id}`,
    source: "school" as const,
    date: r.startsAt,
    aircraftType: r.aircraftType,
    registration: r.aircraftRegistration,
    picName: user.name,
    route: "",
    dayNight: null as string | null,
    landings: null as number | null,
    instrumentHours: null as number | null,
    hours: r.hoursLogged ?? 0,
    role: "pic" as const,
    notes: `Dual instruction — student: ${studentNameById.get(r.studentId) ?? "Unknown"}`,
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
