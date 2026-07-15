import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { hasConfirmedOverlap } from "@/lib/bookings";

export const dynamic = "force-dynamic";

async function attachNames(rows: { studentId: number }[]) {
  if (rows.length === 0) return new Map<number, string>();
  const ids = [...new Set(rows.map((r) => r.studentId))];
  const people = await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, ids));
  return new Map(people.map((p) => [p.id, p.name]));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const conditions = [eq(flightBookings.instructorId, user.id)];
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (from) conditions.push(gte(flightBookings.endsAt, new Date(from)));
  if (to) conditions.push(lte(flightBookings.startsAt, new Date(to)));

  const rows = await db
    .select({
      id: flightBookings.id,
      aircraftId: flightBookings.aircraftId,
      aircraftRegistration: aircraft.registration,
      aircraftType: aircraft.type,
      studentId: flightBookings.studentId,
      startsAt: flightBookings.startsAt,
      endsAt: flightBookings.endsAt,
      purpose: flightBookings.purpose,
      status: flightBookings.status,
      declineReason: flightBookings.declineReason,
      cancelReasonCategory: flightBookings.cancelReasonCategory,
      cancelNote: flightBookings.cancelNote,
    })
    .from(flightBookings)
    .innerJoin(aircraft, eq(aircraft.id, flightBookings.aircraftId))
    .where(and(...conditions))
    .orderBy(flightBookings.startsAt);

  const nameById = await attachNames(rows);
  return NextResponse.json({
    bookings: rows.map((r) => ({ ...r, studentName: nameById.get(r.studentId) ?? "Unknown" })),
  });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const aircraftId = Number(body?.aircraftId);
  const studentId = Number(body?.studentId);
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  const purpose = String(body?.purpose ?? "").trim();

  if (!Number.isInteger(aircraftId) || aircraftId <= 0) {
    return NextResponse.json({ error: "Select an aircraft." }, { status: 400 });
  }
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "Select a student." }, { status: 400 });
  }
  if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime()) || endsAt <= startsAt) {
    return NextResponse.json({ error: "Enter a valid start and end time." }, { status: 400 });
  }
  const durationHours = (endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60);
  if (durationHours > 8) {
    return NextResponse.json({ error: "A single booking cannot exceed 8 hours." }, { status: 400 });
  }

  const [plane] = await db
    .select()
    .from(aircraft)
    .where(and(eq(aircraft.id, aircraftId), eq(aircraft.schoolId, user.schoolId)));
  if (!plane) return NextResponse.json({ error: "Aircraft not found." }, { status: 404 });
  if (plane.status !== "available") {
    return NextResponse.json({ error: `${plane.registration} is currently ${plane.status} and cannot be booked.` }, { status: 400 });
  }

  const [student] = await db
    .select({ id: users.id, role: users.role, instructorId: users.instructorId })
    .from(users)
    .where(eq(users.id, studentId));
  if (!student || student.role !== "student" || student.instructorId !== user.id) {
    return NextResponse.json({ error: "Select one of your assigned students." }, { status: 400 });
  }

  if (await hasConfirmedOverlap(aircraftId, startsAt, endsAt)) {
    return NextResponse.json(
      { error: `${plane.registration} already has a confirmed flight during this time.` },
      { status: 409 },
    );
  }

  const [created] = await db
    .insert(flightBookings)
    .values({
      schoolId: user.schoolId,
      aircraftId,
      instructorId: user.id,
      studentId,
      startsAt,
      endsAt,
      purpose,
      status: "pending",
    })
    .returning();
  return NextResponse.json({ booking: created });
}
