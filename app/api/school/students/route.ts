import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const instructors = db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "instructor")));

  const [students, instructorRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        shareWithSchool: users.shareWithSchool,
        instructorId: users.instructorId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "student"))),
    instructors,
  ]);

  return NextResponse.json({ students, instructors: instructorRows });
}
