import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const studentId = Number(body?.studentId);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return NextResponse.json({ error: "studentId is required." }, { status: 400 });
  }
  const [student] = await db
    .select({ id: users.id, schoolId: users.schoolId, role: users.role })
    .from(users)
    .where(eq(users.id, studentId));
  if (!student || student.role !== "student" || student.schoolId !== user.schoolId) {
    return NextResponse.json({ error: "Student not found at this school." }, { status: 404 });
  }

  let instructorId: number | null = null;
  if (body?.instructorId !== null && body?.instructorId !== undefined && body?.instructorId !== "") {
    instructorId = Number(body.instructorId);
    if (!Number.isInteger(instructorId) || instructorId <= 0) {
      return NextResponse.json({ error: "Invalid instructorId." }, { status: 400 });
    }
    const [instructor] = await db
      .select({ id: users.id, schoolId: users.schoolId, role: users.role })
      .from(users)
      .where(eq(users.id, instructorId));
    if (!instructor || instructor.role !== "instructor" || instructor.schoolId !== user.schoolId) {
      return NextResponse.json({ error: "Instructor not found at this school." }, { status: 404 });
    }
  }

  await db.update(users).set({ instructorId }).where(and(eq(users.id, studentId)));
  return NextResponse.json({ ok: true, instructorId });
}
