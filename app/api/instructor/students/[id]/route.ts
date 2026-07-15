import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";
import { buildStudentReport } from "@/lib/reports";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const { id } = await ctx.params;
  const studentId = Number(id);
  if (!Number.isInteger(studentId)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }

  const [student] = await db
    .select({ id: users.id, instructorId: users.instructorId, shareWithSchool: users.shareWithSchool, role: users.role })
    .from(users)
    .where(eq(users.id, studentId));
  if (!student || student.role !== "student" || student.instructorId !== user.id) {
    return NextResponse.json({ error: "Student not found." }, { status: 404 });
  }
  if (!student.shareWithSchool) {
    return NextResponse.json(
      { error: "This student has not opted in to share their study data.", code: "no-consent" },
      { status: 403 },
    );
  }

  const report = await buildStudentReport(studentId);
  return NextResponse.json({ report });
}
