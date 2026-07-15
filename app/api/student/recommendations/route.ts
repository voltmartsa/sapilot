import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, questions, studySessions, subjects } from "@/lib/db/schema";
import { getSessionUser, isSubscribed } from "@/lib/auth";

export const dynamic = "force-dynamic";

const WEAK_THRESHOLD = 0.7; // below 70% correct flags a chapter for review
const MIN_ATTEMPTS = 2; // ignore chapters seen only once — too noisy to judge
const MAX_EXAMS = 10; // how many recent completed exams to analyse

/**
 * Looks at the student's recent completed mock exams for a subject and finds
 * which chapters they are getting wrong most often, so the dashboard can
 * recommend where to focus practice next.
 */
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

  const exams = await db
    .select({
      questionIds: studySessions.questionIds,
      answers: studySessions.answers,
    })
    .from(studySessions)
    .where(
      and(
        eq(studySessions.userId, user.id),
        eq(studySessions.subjectId, subjectId),
        eq(studySessions.kind, "exam"),
        eq(studySessions.status, "completed"),
      ),
    )
    .orderBy(desc(studySessions.completedAt))
    .limit(MAX_EXAMS);

  if (exams.length === 0) {
    return NextResponse.json({ hasExamData: false, examsAnalyzed: 0, recommendations: [] });
  }

  const allQuestionIds = [...new Set(exams.flatMap((e) => e.questionIds))];
  const questionRows = allQuestionIds.length
    ? await db
        .select({
          id: questions.id,
          correct: questions.correct,
          chapterId: chapters.id,
          chapterName: chapters.name,
        })
        .from(questions)
        .innerJoin(chapters, eq(chapters.id, questions.chapterId))
        .where(inArray(questions.id, allQuestionIds))
    : [];
  const questionById = new Map(questionRows.map((q) => [q.id, q]));

  type ChapterAgg = { chapterId: number; chapterName: string; correct: number; wrong: number; unanswered: number };
  const byChapter = new Map<number, ChapterAgg>();
  let overallCorrect = 0;
  let overallTotal = 0;

  for (const exam of exams) {
    for (const qid of exam.questionIds) {
      const q = questionById.get(qid);
      if (!q) continue; // question since deleted
      const given = exam.answers?.[String(qid)];
      const outcome = given === undefined ? "unanswered" : given === q.correct ? "correct" : "wrong";

      let agg = byChapter.get(q.chapterId);
      if (!agg) {
        agg = { chapterId: q.chapterId, chapterName: q.chapterName, correct: 0, wrong: 0, unanswered: 0 };
        byChapter.set(q.chapterId, agg);
      }
      agg[outcome] += 1;

      overallTotal += 1;
      if (outcome === "correct") overallCorrect += 1;
    }
  }

  const recommendations = [...byChapter.values()]
    .map((c) => {
      const total = c.correct + c.wrong + c.unanswered;
      return {
        chapterId: c.chapterId,
        chapterName: c.chapterName,
        correct: c.correct,
        wrong: c.wrong,
        unanswered: c.unanswered,
        total,
        accuracy: total > 0 ? Math.round((c.correct / total) * 100) : 0,
      };
    })
    .filter((c) => c.total >= MIN_ATTEMPTS && c.accuracy / 100 < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 5);

  return NextResponse.json({
    hasExamData: true,
    examsAnalyzed: exams.length,
    overallAccuracy: overallTotal > 0 ? Math.round((overallCorrect / overallTotal) * 100) : null,
    recommendations,
  });
}
