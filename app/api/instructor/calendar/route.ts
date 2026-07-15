import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Read-only, school-wide view of scheduled/requested flights, for the shared calendar. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const conditions = [
    eq(flightBookings.schoolId, user.schoolId),
    inArray(flightBookings.status, ["pending", "confirmed"]),
  ];
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (from) conditions.push(gte(flightBookings.endsAt, new Date(from)));
  if (to) conditions.push(lte(flightBookings.startsAt, new Date(to)));

  const rows = await db
    .select({
      id: flightBookings.id,
      aircraftId: flightBookings.aircraftId,
      aircraftRegistration: aircraft.registration,
      instructorId: flightBookings.instructorId,
      studentId: flightBookings.studentId,
      startsAt: flightBookings.startsAt,
      endsAt: flightBookings.endsAt,
      status: flightBookings.status,
    })
    .from(flightBookings)
    .innerJoin(aircraft, eq(aircraft.id, flightBookings.aircraftId))
    .where(and(...conditions))
    .orderBy(flightBookings.startsAt);

  const peopleIds = [...new Set(rows.flatMap((r) => [r.instructorId, r.studentId]))];
  const people = peopleIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, peopleIds))
    : [];
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return NextResponse.json({
    bookings: rows.map((r) => ({
      ...r,
      instructorName: nameById.get(r.instructorId) ?? "Unknown",
      studentName: nameById.get(r.studentId) ?? "Unknown",
      isMine: r.instructorId === user.id,
    })),
  });
}
