import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chapters,
  questions,
  reports,
  studySessions,
  subjects,
  users,
} from "@/lib/db/schema";
import { checkAdminPasscode } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const [[userAgg], [questionAgg], [sessionAgg], [reportAgg]] = await Promise.all([
    db
      .select({
        totalUsers: sql<number>`count(*)`.mapWith(Number),
        newThisWeek: sql<number>`count(*) filter (where ${users.createdAt} > now() - interval '7 days')`.mapWith(Number),
      })
      .from(users),
    db.select({ totalQuestions: sql<number>`count(*)`.mapWith(Number) }).from(questions),
    db
      .select({
        totalSessions: sql<number>`count(*)`.mapWith(Number),
        completedSessions: sql<number>`count(*) filter (where ${studySessions.status} = 'completed')`.mapWith(Number),
        examsTaken: sql<number>`count(*) filter (where ${studySessions.kind} = 'exam' and ${studySessions.status} = 'completed')`.mapWith(Number),
        questionsAnswered: sql<number>`coalesce(sum(${studySessions.answeredCount}), 0)`.mapWith(Number),
        questionsCorrect: sql<number>`coalesce(sum(${studySessions.correctCount}), 0)`.mapWith(Number),
      })
      .from(studySessions),
    db
      .select({
        openReports: sql<number>`count(*) filter (where ${reports.status} = 'open')`.mapWith(Number),
        totalReports: sql<number>`count(*)`.mapWith(Number),
      })
      .from(reports),
  ]);

  // Most practised subjects (top 5 by sessions).
  const activeSubjects = await db
    .select({
      subjectName: subjects.name,
      sessions: sql<number>`count(*)`.mapWith(Number),
    })
    .from(studySessions)
    .innerJoin(subjects, eq(subjects.id, studySessions.subjectId))
    .groupBy(subjects.name)
    .orderBy(desc(sql`count(*)`))
    .limit(5);

  // Bank coverage per subject (top-level shape for the dashboard table).
  const coverage = await db
    .select({
      subjectId: subjects.id,
      subjectName: subjects.name,
      chapterCount: sql<number>`count(distinct ${chapters.id})`.mapWith(Number),
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(subjects)
    .leftJoin(chapters, eq(chapters.subjectId, subjects.id))
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .groupBy(subjects.id)
    .orderBy(desc(sql`count(${questions.id})`))
    .limit(8);

  return NextResponse.json({
    stats: {
      ...userAgg,
      ...questionAgg,
      ...sessionAgg,
      ...reportAgg,
      overallAccuracy:
        sessionAgg.questionsAnswered > 0
          ? Math.round((sessionAgg.questionsCorrect / sessionAgg.questionsAnswered) * 100)
          : null,
    },
    activeSubjects,
    coverage,
  });
}
