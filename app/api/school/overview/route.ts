import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const [school] = await db.select().from(schools).where(eq(schools.id, user.schoolId));
  const [instructorAgg] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "instructor")));
  const [studentAgg] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      sharing: sql<number>`count(*) filter (where ${users.shareWithSchool})`.mapWith(Number),
      assigned: sql<number>`count(*) filter (where ${users.instructorId} is not null)`.mapWith(Number),
    })
    .from(users)
    .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "student")));

  return NextResponse.json({
    school,
    instructorCount: instructorAgg.count,
    studentCount: studentAgg.total,
    sharingCount: studentAgg.sharing,
    assignedCount: studentAgg.assigned,
  });
}
