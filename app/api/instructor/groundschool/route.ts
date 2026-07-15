import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { groundSchoolSessions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const conditions = [eq(groundSchoolSessions.instructorId, user.id)];
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (from) conditions.push(gte(groundSchoolSessions.endsAt, new Date(from)));
  if (to) conditions.push(lte(groundSchoolSessions.startsAt, new Date(to)));

  const rows = await db
    .select()
    .from(groundSchoolSessions)
    .where(and(...conditions))
    .orderBy(groundSchoolSessions.startsAt);
  return NextResponse.json({ sessions: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const title = String(body?.title ?? "").trim();
  const startsAt = new Date(String(body?.startsAt ?? ""));
  const endsAt = new Date(String(body?.endsAt ?? ""));
  const location = String(body?.location ?? "").trim();
  const notes = String(body?.notes ?? "").trim();

  if (!title) return NextResponse.json({ error: "Enter a title for this session." }, { status: 400 });
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return NextResponse.json({ error: "Enter valid start and end times." }, { status: 400 });
  }
  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 });
  }

  const [created] = await db
    .insert(groundSchoolSessions)
    .values({ schoolId: user.schoolId, instructorId: user.id, title, startsAt, endsAt, location, notes })
    .returning();
  return NextResponse.json({ session: created });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const patch: Partial<typeof groundSchoolSessions.$inferInsert> = { updatedAt: new Date() };
  if (body?.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) return NextResponse.json({ error: "Title cannot be empty." }, { status: 400 });
    patch.title = title;
  }
  if (body?.location !== undefined) patch.location = String(body.location).trim();
  if (body?.notes !== undefined) patch.notes = String(body.notes).trim();

  let startsAt = body?.startsAt !== undefined ? new Date(String(body.startsAt)) : undefined;
  let endsAt = body?.endsAt !== undefined ? new Date(String(body.endsAt)) : undefined;
  if (startsAt !== undefined) {
    if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "Enter a valid start time." }, { status: 400 });
    patch.startsAt = startsAt;
  }
  if (endsAt !== undefined) {
    if (Number.isNaN(endsAt.getTime())) return NextResponse.json({ error: "Enter a valid end time." }, { status: 400 });
    patch.endsAt = endsAt;
  }

  const [existing] = await db
    .select()
    .from(groundSchoolSessions)
    .where(and(eq(groundSchoolSessions.id, id), eq(groundSchoolSessions.instructorId, user.id)));
  if (!existing) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  const finalStart = patch.startsAt ?? existing.startsAt;
  const finalEnd = patch.endsAt ?? existing.endsAt;
  if (finalEnd <= finalStart) {
    return NextResponse.json({ error: "End time must be after the start time." }, { status: 400 });
  }

  const updated = await db
    .update(groundSchoolSessions)
    .set(patch)
    .where(and(eq(groundSchoolSessions.id, id), eq(groundSchoolSessions.instructorId, user.id)))
    .returning();
  return NextResponse.json({ session: updated[0] });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const deleted = await db
    .delete(groundSchoolSessions)
    .where(and(eq(groundSchoolSessions.id, id), eq(groundSchoolSessions.instructorId, user.id)))
    .returning({ id: groundSchoolSessions.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
