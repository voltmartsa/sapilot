import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const now = new Date();
  const rows = await db
    .select({
      id: flightBookings.id,
      aircraftRegistration: aircraft.registration,
      aircraftType: aircraft.type,
      instructorId: flightBookings.instructorId,
      startsAt: flightBookings.startsAt,
      endsAt: flightBookings.endsAt,
      purpose: flightBookings.purpose,
      status: flightBookings.status,
      cancelReasonCategory: flightBookings.cancelReasonCategory,
      cancelNote: flightBookings.cancelNote,
      cancelledAt: flightBookings.cancelledAt,
      hoursLogged: flightBookings.hoursLogged,
      hoursRole: flightBookings.hoursRole,
    })
    .from(flightBookings)
    .innerJoin(aircraft, eq(aircraft.id, flightBookings.aircraftId))
    .where(
      and(
        eq(flightBookings.studentId, user.id),
        inArray(flightBookings.status, ["pending", "confirmed", "cancelled"]),
      ),
    )
    .orderBy(flightBookings.startsAt);

  const instructorIds = [...new Set(rows.map((r) => r.instructorId))];
  const instructors = instructorIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, instructorIds))
    : [];
  const nameById = new Map(instructors.map((i) => [i.id, i.name]));

  const withNames = rows.map((r) => ({ ...r, instructorName: nameById.get(r.instructorId) ?? "Unknown" }));

  return NextResponse.json({
    upcoming: withNames.filter((r) => r.status === "confirmed" && r.endsAt >= now),
    pending: withNames.filter((r) => r.status === "pending" && r.endsAt >= now),
    needsHours: withNames.filter((r) => r.status === "confirmed" && r.endsAt < now && r.hoursLogged === null),
    history: withNames.filter((r) => r.status === "confirmed" && r.endsAt < now && r.hoursLogged !== null),
    cancelled: withNames
      .filter((r) => r.status === "cancelled")
      .sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime())
      .slice(0, 10),
  });
}
