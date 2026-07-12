import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, questions, subjects } from "@/lib/db/schema";
import { getSessionUser, isSubscribed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const subjectId = Number(req.nextUrl.searchParams.get("subjectId"));
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  }
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  if (!(await isSubscribed(user.id, subject.qualificationId))) {
    return NextResponse.json({ error: "Not subscribed.", code: "subscription" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: chapters.id,
      name: chapters.name,
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(chapters)
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .where(eq(chapters.subjectId, subjectId))
    .groupBy(chapters.id)
    .orderBy(chapters.sortOrder, chapters.name);

  return NextResponse.json({
    subject: {
      id: subject.id,
      name: subject.name,
      examQuestions: subject.examQuestions,
      examMinutes: subject.examMinutes,
      passMark: subject.passMark,
    },
    chapters: rows.filter((r) => r.questionCount > 0),
  });
}
