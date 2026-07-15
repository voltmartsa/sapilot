import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { flightBookings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Instructor withdraws their own still-pending request — no reason required. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const [booking] = await db
    .select()
    .from(flightBookings)
    .where(and(eq(flightBookings.id, id), eq(flightBookings.instructorId, user.id)));
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "pending") {
    return NextResponse.json({ error: "Only a pending request can be withdrawn." }, { status: 409 });
  }
  await db
    .update(flightBookings)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(eq(flightBookings.id, id));
  return NextResponse.json({ ok: true });
}
