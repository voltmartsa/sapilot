import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const [row] = await db
    .select({
      schoolId: users.schoolId,
      shareWithSchool: users.shareWithSchool,
      instructorId: users.instructorId,
    })
    .from(users)
    .where(eq(users.id, user.id));

  let schoolName: string | null = null;
  let instructorName: string | null = null;
  if (row.schoolId) {
    const [school] = await db.select({ name: schools.name }).from(schools).where(eq(schools.id, row.schoolId));
    schoolName = school?.name ?? null;
  }
  if (row.instructorId) {
    const [instructor] = await db.select({ name: users.name }).from(users).where(eq(users.id, row.instructorId));
    instructorName = instructor?.name ?? null;
  }

  return NextResponse.json({
    schoolId: row.schoolId,
    schoolName,
    shareWithSchool: row.shareWithSchool,
    instructorId: row.instructorId,
    instructorName,
  });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const [current] = await db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, user.id));

  const patch: { schoolId?: number | null; shareWithSchool?: boolean; instructorId?: null } = {};

  if (body?.schoolId !== undefined) {
    if (body.schoolId === null) {
      patch.schoolId = null;
      patch.shareWithSchool = false;
    } else {
      const schoolId = Number(body.schoolId);
      if (!Number.isInteger(schoolId) || schoolId <= 0) {
        return NextResponse.json({ error: "Select a valid school." }, { status: 400 });
      }
      const [school] = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId));
      if (!school) {
        return NextResponse.json({ error: "That school could not be found." }, { status: 400 });
      }
      patch.schoolId = schoolId;
    }
    // Changing (or clearing) the school invalidates any instructor assignment
    // from the previous school.
    if (patch.schoolId !== current.schoolId) {
      patch.instructorId = null;
    }
  }

  if (body?.shareWithSchool !== undefined) {
    const targetSchoolId = patch.schoolId !== undefined ? patch.schoolId : current.schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ error: "You must be affiliated with a school to share data with it." }, { status: 400 });
    }
    patch.shareWithSchool = !!body.shareWithSchool;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await db.update(users).set(patch).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
