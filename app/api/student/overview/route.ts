import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { savedQuestions, studySessions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Dashboard overview: fun stats + recent sessions for the selected subject. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const subjectId = Number(req.nextUrl.searchParams.get("subjectId"));
  const scope = [eq(studySessions.userId, user.id)];
  if (Number.isInteger(subjectId) && subjectId > 0) {
    scope.push(eq(studySessions.subjectId, subjectId));
  }

  const [agg] = await db
    .select({
      sessionsCompleted: sql<number>`count(*) filter (where ${studySessions.status} = 'completed')`.mapWith(Number),
      examsCompleted: sql<number>`count(*) filter (where ${studySessions.status} = 'completed' and ${studySessions.kind} = 'exam')`.mapWith(Number),
      questionsAnswered: sql<number>`coalesce(sum(${studySessions.answeredCount}) filter (where ${studySessions.status} = 'completed'), 0)`.mapWith(Number),
      questionsCorrect: sql<number>`coalesce(sum(${studySessions.correctCount}) filter (where ${studySessions.status} = 'completed'), 0)`.mapWith(Number),
      bestExamPct: sql<number>`coalesce(max(case when ${studySessions.kind} = 'exam' and ${studySessions.status} = 'completed' and jsonb_array_length(${studySessions.questionIds}) > 0 then round(100.0 * ${studySessions.correctCount} / jsonb_array_length(${studySessions.questionIds})) end), 0)`.mapWith(Number),
      secondsInExams: sql<number>`coalesce(sum(${studySessions.secondsUsed}) filter (where ${studySessions.kind} = 'exam'), 0)`.mapWith(Number),
    })
    .from(studySessions)
    .where(and(...scope));

  const [savedAgg] = await db
    .select({ savedCount: sql<number>`count(*)`.mapWith(Number) })
    .from(savedQuestions)
    .where(eq(savedQuestions.userId, user.id));

  const recent = await db
    .select({
      id: studySessions.id,
      kind: studySessions.kind,
      status: studySessions.status,
      label: studySessions.label,
      questionIds: studySessions.questionIds,
      answers: studySessions.answers,
      currentIndex: studySessions.currentIndex,
      correctCount: studySessions.correctCount,
      answeredCount: studySessions.answeredCount,
      createdAt: studySessions.createdAt,
      updatedAt: studySessions.updatedAt,
    })
    .from(studySessions)
    .where(and(...scope))
    .orderBy(desc(studySessions.updatedAt))
    .limit(8);

  return NextResponse.json({
    stats: {
      ...agg,
      accuracy:
        agg.questionsAnswered > 0
          ? Math.round((agg.questionsCorrect / agg.questionsAnswered) * 100)
          : null,
      savedCount: savedAgg.savedCount,
    },
    sessions: recent.map((s) => ({
      id: s.id,
      kind: s.kind,
      status: s.status,
      label: s.label,
      total: s.questionIds.length,
      answeredNow: Object.keys(s.answers ?? {}).length,
      correctCount: s.correctCount,
      answeredCount: s.answeredCount,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  });
}
