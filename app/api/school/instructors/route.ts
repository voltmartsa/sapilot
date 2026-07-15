import { NextRequest, NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser, hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      createdAt: users.createdAt,
      studentCount: sql<number>`(select count(*) from users s where s.instructor_id = ${users.id})`.mapWith(Number),
    })
    .from(users)
    .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "instructor")));

  return NextResponse.json({ instructors: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter the instructor's full name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "The password must be at least 8 characters." }, { status: 400 });
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      role: "instructor",
      schoolId: user.schoolId,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  return NextResponse.json({ instructor: created });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const instructorId = Number(body?.instructorId);
  if (!Number.isInteger(instructorId) || instructorId <= 0) {
    return NextResponse.json({ error: "instructorId is required." }, { status: 400 });
  }

  const deleted = await db
    .delete(users)
    .where(
      and(
        eq(users.id, instructorId),
        eq(users.schoolId, user.schoolId),
        eq(users.role, "instructor"),
      ),
    )
    .returning({ id: users.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Instructor not found." }, { status: 404 });
  }
  // Their assigned students' instructorId is cleared automatically (onDelete: set null).
  return NextResponse.json({ ok: true });
}
