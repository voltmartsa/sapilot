import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { flightBookings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_ROLE = new Set(["dual", "solo", "pic"]);

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const bookingId = Number(body?.bookingId);
  const hours = Number(body?.hours);
  const role = String(body?.role ?? "dual");

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    return NextResponse.json({ error: "bookingId is required." }, { status: 400 });
  }
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
    return NextResponse.json({ error: "Enter a valid number of hours (up to 24)." }, { status: 400 });
  }
  if (!VALID_ROLE.has(role)) {
    return NextResponse.json({ error: "Invalid flight role." }, { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(flightBookings)
    .where(and(eq(flightBookings.id, bookingId), eq(flightBookings.studentId, user.id)));
  if (!booking) return NextResponse.json({ error: "Flight not found." }, { status: 404 });
  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "Hours can only be logged for a confirmed flight." }, { status: 409 });
  }
  if (booking.endsAt > new Date()) {
    return NextResponse.json({ error: "This flight hasn't happened yet." }, { status: 409 });
  }

  await db
    .update(flightBookings)
    .set({ hoursLogged: hours, hoursLoggedAt: new Date(), hoursRole: role, updatedAt: new Date() })
    .where(eq(flightBookings.id, bookingId));
  return NextResponse.json({ ok: true });
}
