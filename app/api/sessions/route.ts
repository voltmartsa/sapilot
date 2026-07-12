import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, questions, studySessions, subjects } from "@/lib/db/schema";
import { getSessionUser, isSubscribed } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** List the current user's study sessions, optionally scoped by subject/kind/status. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const p = req.nextUrl.searchParams;
  const conditions = [eq(studySessions.userId, user.id)];
  const subjectId = Number(p.get("subjectId"));
  if (Number.isInteger(subjectId) && subjectId > 0) {
    conditions.push(eq(studySessions.subjectId, subjectId));
  }
  const kind = p.get("kind");
  if (kind === "practice" || kind === "exam") {
    conditions.push(eq(studySessions.kind, kind));
  }
  const status = p.get("status");
  if (status === "active" || status === "completed") {
    conditions.push(eq(studySessions.status, status));
  }
  const limit = Math.min(Math.max(Number(p.get("limit")) || 20, 1), 50);

  const rows = await db
    .select({
      id: studySessions.id,
      subjectId: studySessions.subjectId,
      kind: studySessions.kind,
      status: studySessions.status,
      label: studySessions.label,
      questionIds: studySessions.questionIds,
      answers: studySessions.answers,
      currentIndex: studySessions.currentIndex,
      totalSeconds: studySessions.totalSeconds,
      secondsUsed: studySessions.secondsUsed,
      correctCount: studySessions.correctCount,
      answeredCount: studySessions.answeredCount,
      createdAt: studySessions.createdAt,
      completedAt: studySessions.completedAt,
      subjectName: subjects.name,
    })
    .from(studySessions)
    .innerJoin(subjects, eq(subjects.id, studySessions.subjectId))
    .where(and(...conditions))
    .orderBy(desc(studySessions.updatedAt))
    .limit(limit);

  return NextResponse.json({
    sessions: rows.map((r) => ({
      ...r,
      total: r.questionIds.length,
      answers: undefined,
      questionIds: undefined,
      answeredNow: Object.keys(r.answers ?? {}).length,
    })),
  });
}

/** Create a practice or exam session. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const kind = String(body?.kind ?? "");
  const subjectId = Number(body?.subjectId);
  if ((kind !== "practice" && kind !== "exam") || !Number.isInteger(subjectId)) {
    return NextResponse.json({ error: "kind and subjectId are required." }, { status: 400 });
  }

  const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  if (!(await isSubscribed(user.id, subject.qualificationId))) {
    return NextResponse.json(
      { error: "Subscribe to this qualification first.", code: "subscription" },
      { status: 403 },
    );
  }

  let questionIds: number[] = [];
  let label = "";
  let totalSeconds: number | null = null;

  if (kind === "practice") {
    const chapterIds: number[] = Array.isArray(body?.chapterIds)
      ? body.chapterIds.map(Number).filter((n: number) => Number.isInteger(n) && n > 0)
      : [];
    const conditions = [eq(chapters.subjectId, subjectId)];
    if (chapterIds.length > 0) conditions.push(inArray(chapters.id, chapterIds));

    const rows = await db
      .select({ id: questions.id, chapterName: chapters.name })
      .from(questions)
      .innerJoin(chapters, eq(chapters.id, questions.chapterId))
      .where(and(...conditions))
      .orderBy(chapters.sortOrder, chapters.id, questions.id);

    const total = rows.length;
    if (total === 0) {
      return NextResponse.json({ error: "No questions in this selection." }, { status: 400 });
    }
    let start = Number(body?.rangeStart) || 1;
    let end = Number(body?.rangeEnd) || total;
    start = Math.min(Math.max(1, start), total);
    end = Math.min(Math.max(start, end), total);
    questionIds = rows.slice(start - 1, end).map((r) => r.id);

    const chapterNames = [...new Set(rows.slice(start - 1, end).map((r) => r.chapterName))];
    const chapterLabel =
      chapterNames.length === 1
        ? chapterNames[0]
        : `${chapterNames.length} chapters`;
    label = `${chapterLabel} · Q${start}–${end}`;
  } else {
    const count = Math.min(Math.max(Number(body?.count) || subject.examQuestions, 1), 200);
    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .innerJoin(chapters, eq(chapters.id, questions.chapterId))
      .where(eq(chapters.subjectId, subjectId))
      .orderBy(sql`random()`)
      .limit(count);
    if (rows.length === 0) {
      return NextResponse.json({ error: "No questions in this subject yet." }, { status: 400 });
    }
    questionIds = rows.map((r) => r.id);
    totalSeconds =
      Math.max(10, Math.round((questionIds.length / subject.examQuestions) * subject.examMinutes)) * 60;
    label = `Mock exam · ${questionIds.length} questions`;
  }

  const [created] = await db
    .insert(studySessions)
    .values({ userId: user.id, subjectId, kind, questionIds, label, totalSeconds })
    .returning({ id: studySessions.id });

  return NextResponse.json({ session: { id: created.id } });
}
