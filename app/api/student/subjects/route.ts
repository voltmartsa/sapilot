import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, qualifications, questions, subjects } from "@/lib/db/schema";
import { getSessionUser, getSubscribedQualificationIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Subjects grouped by the user's subscribed qualifications — powers the subject switcher. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const qualIds = await getSubscribedQualificationIds(user.id);
  if (qualIds.length === 0) {
    return NextResponse.json({ groups: [] });
  }

  const quals = await db
    .select()
    .from(qualifications)
    .where(inArray(qualifications.id, qualIds))
    .orderBy(qualifications.sortOrder);

  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      qualificationId: subjects.qualificationId,
      sortOrder: subjects.sortOrder,
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(subjects)
    .leftJoin(chapters, eq(chapters.subjectId, subjects.id))
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .where(inArray(subjects.qualificationId, qualIds))
    .groupBy(subjects.id)
    .orderBy(subjects.sortOrder);

  return NextResponse.json({
    groups: quals.map((q) => ({
      qualificationId: q.id,
      shortName: q.shortName,
      name: q.name,
      subjects: subjectRows
        .filter((s) => s.qualificationId === q.id)
        .map((s) => ({ id: s.id, name: s.name, questionCount: s.questionCount })),
    })),
  });
}
