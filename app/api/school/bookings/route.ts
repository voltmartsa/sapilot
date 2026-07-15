import { NextRequest, NextResponse } from "next/server";
import { and, eq, gt, gte, inArray, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { hasConfirmedOverlap } from "@/lib/bookings";

export const dynamic = "force-dynamic";

const instructorAlias = users;

async function listBookings(schoolId: number, params: URLSearchParams) {
  const conditions = [eq(flightBookings.schoolId, schoolId)];
  const status = params.get("status");
  if (status) conditions.push(eq(flightBookings.status, status));
  const from = params.get("from");
  const to = params.get("to");
  if (from) conditions.push(gte(flightBookings.endsAt, new Date(from)));
  if (to) conditions.push(lte(flightBookings.startsAt, new Date(to)));

  const rows = await db
    .select({
      id: flightBookings.id,
      aircraftId: flightBookings.aircraftId,
      aircraftRegistration: aircraft.registration,
      aircraftType: aircraft.type,
      instructorId: flightBookings.instructorId,
      studentId: flightBookings.studentId,
      startsAt: flightBookings.startsAt,
      endsAt: flightBookings.endsAt,
      purpose: flightBookings.purpose,
      status: flightBookings.status,
      declineReason: flightBookings.declineReason,
      cancelReasonCategory: flightBookings.cancelReasonCategory,
      cancelNote: flightBookings.cancelNote,
      createdAt: flightBookings.createdAt,
    })
    .from(flightBookings)
    .innerJoin(aircraft, eq(aircraft.id, flightBookings.aircraftId))
    .where(and(...conditions))
    .orderBy(flightBookings.startsAt);

  if (rows.length === 0) return [];

  const peopleIds = [...new Set(rows.flatMap((r) => [r.instructorId, r.studentId]))];
  const people = await db
    .select({ id: instructorAlias.id, name: instructorAlias.name })
    .from(instructorAlias)
    .where(inArray(instructorAlias.id, peopleIds));
  const nameById = new Map(people.map((p) => [p.id, p.name]));

  return rows.map((r) => ({
    ...r,
    instructorName: nameById.get(r.instructorId) ?? "Unknown",
    studentName: nameById.get(r.studentId) ?? "Unknown",
  }));
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const bookings = await listBookings(user.schoolId, req.nextUrl.searchParams);
  return NextResponse.json({ bookings });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const action = String(body?.action ?? "");
  if (!Number.isInteger(id) || id <= 0 || !["accept", "decline"].includes(action)) {
    return NextResponse.json({ error: "id and a valid action are required." }, { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(flightBookings)
    .where(and(eq(flightBookings.id, id), eq(flightBookings.schoolId, user.schoolId)));
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "This request has already been decided." }, { status: 409 });
  }

  if (action === "decline") {
    const declineReason = String(body?.declineReason ?? "").trim();
    if (!declineReason) {
      return NextResponse.json({ error: "Enter a reason for declining this request." }, { status: 400 });
    }
    await db
      .update(flightBookings)
      .set({ status: "declined", declineReason, updatedAt: new Date() })
      .where(eq(flightBookings.id, id));
    return NextResponse.json({ ok: true, status: "declined" });
  }

  // action === "accept"
  if (await hasConfirmedOverlap(booking.aircraftId, booking.startsAt, booking.endsAt, id)) {
    return NextResponse.json(
      { error: "This aircraft is already confirmed for an overlapping flight. Decline this request or pick another aircraft." },
      { status: 409 },
    );
  }
  await db
    .update(flightBookings)
    .set({ status: "confirmed", updatedAt: new Date() })
    .where(eq(flightBookings.id, id));

  // Auto-decline any other still-pending requests for the same aircraft that now overlap.
  const overlappingPending = await db
    .select({ id: flightBookings.id })
    .from(flightBookings)
    .where(
      and(
        eq(flightBookings.aircraftId, booking.aircraftId),
        eq(flightBookings.status, "pending"),
        lt(flightBookings.startsAt, booking.endsAt),
        gt(flightBookings.endsAt, booking.startsAt),
      ),
    );
  const toDecline = overlappingPending.filter((r) => r.id !== id).map((r) => r.id);
  if (toDecline.length > 0) {
    await db
      .update(flightBookings)
      .set({
        status: "declined",
        declineReason: "Aircraft was confirmed for another flight during this time.",
        updatedAt: new Date(),
      })
      .where(inArray(flightBookings.id, toDecline));
  }

  return NextResponse.json({ ok: true, status: "confirmed", autoDeclined: toDecline.length });
}
