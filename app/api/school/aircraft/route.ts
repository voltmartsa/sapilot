import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, flightBookings } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const VALID_STATUS = new Set(["available", "maintenance", "offline"]);

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const rows = await db.select().from(aircraft).where(eq(aircraft.schoolId, user.schoolId));
  return NextResponse.json({ aircraft: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const registration = String(body?.registration ?? "").trim().toUpperCase();
  const type = String(body?.type ?? "").trim();
  const status = String(body?.status ?? "available");
  const note = String(body?.note ?? "").trim();

  if (!registration) return NextResponse.json({ error: "Enter the aircraft's registration." }, { status: 400 });
  if (!type) return NextResponse.json({ error: "Enter the aircraft type." }, { status: 400 });
  if (!VALID_STATUS.has(status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  const [existing] = await db
    .select({ id: aircraft.id })
    .from(aircraft)
    .where(and(eq(aircraft.schoolId, user.schoolId), eq(aircraft.registration, registration)));
  if (existing) {
    return NextResponse.json({ error: "An aircraft with this registration already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(aircraft)
    .values({ schoolId: user.schoolId, registration, type, status, note })
    .returning();
  return NextResponse.json({ aircraft: created });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const patch: Partial<typeof aircraft.$inferInsert> = {};
  if (body?.registration !== undefined) {
    const registration = String(body.registration).trim().toUpperCase();
    if (!registration) return NextResponse.json({ error: "Registration cannot be empty." }, { status: 400 });
    patch.registration = registration;
  }
  if (body?.type !== undefined) {
    const type = String(body.type).trim();
    if (!type) return NextResponse.json({ error: "Type cannot be empty." }, { status: 400 });
    patch.type = type;
  }
  if (body?.status !== undefined) {
    if (!VALID_STATUS.has(body.status)) return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    patch.status = body.status;
  }
  if (body?.note !== undefined) patch.note = String(body.note).trim();

  const updated = await db
    .update(aircraft)
    .set(patch)
    .where(and(eq(aircraft.id, id), eq(aircraft.schoolId, user.schoolId)))
    .returning();
  if (updated.length === 0) {
    return NextResponse.json({ error: "Aircraft not found." }, { status: 404 });
  }
  return NextResponse.json({ aircraft: updated[0] });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const [owned] = await db
    .select({ id: aircraft.id })
    .from(aircraft)
    .where(and(eq(aircraft.id, id), eq(aircraft.schoolId, user.schoolId)));
  if (!owned) return NextResponse.json({ error: "Aircraft not found." }, { status: 404 });

  const active = await db
    .select({ id: flightBookings.id })
    .from(flightBookings)
    .where(
      and(
        eq(flightBookings.aircraftId, id),
        inArray(flightBookings.status, ["pending", "confirmed"]),
        gte(flightBookings.endsAt, new Date()),
      ),
    );
  if (active.length > 0) {
    return NextResponse.json(
      { error: `This aircraft has ${active.length} upcoming booking${active.length === 1 ? "" : "s"}. Resolve those first.` },
      { status: 409 },
    );
  }

  await db.delete(aircraft).where(eq(aircraft.id, id));
  return NextResponse.json({ ok: true });
}
