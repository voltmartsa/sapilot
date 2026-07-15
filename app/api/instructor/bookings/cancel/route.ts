import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { flightBookings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { CANCEL_REASONS } from "@/lib/bookings";

export const dynamic = "force-dynamic";

/** Instructor cancels a confirmed flight — requires one of the fixed reasons plus a note. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  const reasonCategory = String(body?.reasonCategory ?? "");
  const note = String(body?.note ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  if (!CANCEL_REASONS.has(reasonCategory)) {
    return NextResponse.json(
      { error: "Choose a cancellation reason: weather, maintenance issues, student cancellation or aircraft not available." },
      { status: 400 },
    );
  }
  if (note.length < 5) {
    return NextResponse.json({ error: "Add a short note explaining the cancellation." }, { status: 400 });
  }

  const [booking] = await db
    .select()
    .from(flightBookings)
    .where(and(eq(flightBookings.id, id), eq(flightBookings.instructorId, user.id)));
  if (!booking) return NextResponse.json({ error: "Booking not found." }, { status: 404 });
  if (booking.status !== "confirmed") {
    return NextResponse.json({ error: "Only a confirmed flight can be cancelled this way." }, { status: 409 });
  }

  await db
    .update(flightBookings)
    .set({
      status: "cancelled",
      cancelReasonCategory: reasonCategory,
      cancelNote: note,
      cancelledBy: user.id,
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(flightBookings.id, id));
  return NextResponse.json({ ok: true });
}
