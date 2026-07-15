import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { groundSchoolSessions, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Read-only, school-wide view of groundschool sessions, plus deletion for oversight. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const conditions = [eq(groundSchoolSessions.schoolId, user.schoolId)];
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  if (from) conditions.push(gte(groundSchoolSessions.endsAt, new Date(from)));
  if (to) conditions.push(lte(groundSchoolSessions.startsAt, new Date(to)));

  const rows = await db
    .select()
    .from(groundSchoolSessions)
    .where(and(...conditions))
    .orderBy(groundSchoolSessions.startsAt);

  const instructorIds = [...new Set(rows.map((r) => r.instructorId))];
  const instructors = instructorIds.length
    ? await db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, instructorIds))
    : [];
  const nameById = new Map(instructors.map((i) => [i.id, i.name]));

  return NextResponse.json({
    sessions: rows.map((r) => ({ ...r, instructorName: nameById.get(r.instructorId) ?? "Unknown" })),
  });
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
  const deleted = await db
    .delete(groundSchoolSessions)
    .where(and(eq(groundSchoolSessions.id, id), eq(groundSchoolSessions.schoolId, user.schoolId)))
    .returning({ id: groundSchoolSessions.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
