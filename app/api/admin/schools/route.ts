import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { checkAdminAuth } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const rows = await db
    .select({
      id: schools.id,
      name: schools.name,
      createdAt: schools.createdAt,
      instructorCount: sql<number>`(select count(*) from users u where u.school_id = ${schools.id} and u.role = 'instructor')`.mapWith(Number),
      studentCount: sql<number>`(select count(*) from users u where u.school_id = ${schools.id} and u.role = 'student')`.mapWith(Number),
      adminCount: sql<number>`(select count(*) from users u where u.school_id = ${schools.id} and u.role = 'school_admin')`.mapWith(Number),
    })
    .from(schools)
    .orderBy(schools.name);
  return NextResponse.json({ schools: rows });
}

export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter the school's name." }, { status: 400 });
  }
  const [existing] = await db.select({ id: schools.id }).from(schools).where(eq(schools.name, name));
  if (existing) {
    return NextResponse.json({ error: "A school with this name already exists." }, { status: 409 });
  }
  const [created] = await db.insert(schools).values({ name }).returning();
  return NextResponse.json({ school: created });
}

export async function DELETE(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const [dependents] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(and(eq(users.schoolId, id)));
  if (dependents.count > 0) {
    return NextResponse.json(
      {
        error: `This school still has ${dependents.count} linked account${dependents.count === 1 ? "" : "s"} (admins, instructors or students). Remove or reassign them first.`,
      },
      { status: 409 },
    );
  }
  const deleted = await db.delete(schools).where(eq(schools.id, id)).returning({ id: schools.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "School not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
