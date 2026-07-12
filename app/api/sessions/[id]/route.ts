import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, questions, studySessions, subjects } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function loadOwnSession(id: number, userId: number) {
  const [row] = await db
    .select()
    .from(studySessions)
    .where(and(eq(studySessions.id, id), eq(studySessions.userId, userId)));
  return row;
}

/** Full session payload: state + ordered question objects. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  const session = await loadOwnSession(sessionId, user.id);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

  const [subject] = await db
    .select({ id: subjects.id, name: subjects.name, passMark: subjects.passMark })
    .from(subjects)
    .where(eq(subjects.id, session.subjectId));

  const rows = session.questionIds.length
    ? await db
        .select({
          id: questions.id,
          imageId: questions.imageId,
          text: questions.text,
          optionA: questions.optionA,
          optionB: questions.optionB,
          optionC: questions.optionC,
          optionD: questions.optionD,
          correct: questions.correct,
          explanation: questions.explanation,
          chapterName: chapters.name,
        })
        .from(questions)
        .innerJoin(chapters, eq(chapters.id, questions.chapterId))
        .where(inArray(questions.id, session.questionIds))
    : [];
  // Preserve the stored order; drop ids whose questions were deleted since.
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ordered = session.questionIds
    .map((qid) => byId.get(qid))
    .filter((q): q is NonNullable<typeof q> => !!q);

  return NextResponse.json({
    session: {
      id: session.id,
      kind: session.kind,
      status: session.status,
      label: session.label,
      answers: session.answers ?? {},
      currentIndex: session.currentIndex,
      totalSeconds: session.totalSeconds,
      secondsUsed: session.secondsUsed,
      correctCount: session.correctCount,
      createdAt: session.createdAt,
      completedAt: session.completedAt,
    },
    subject,
    questions: ordered,
  });
}

/** Save progress (answers / position / timer) or complete the session. */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  const session = await loadOwnSession(sessionId, user.id);
  if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
  if (session.status === "completed") {
    return NextResponse.json({ error: "This session is already completed." }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const patch: Partial<typeof studySessions.$inferInsert> = { updatedAt: new Date() };

  if (body?.answers && typeof body.answers === "object") {
    const clean: Record<string, string> = {};
    const validIds = new Set(session.questionIds.map(String));
    for (const [k, v] of Object.entries(body.answers as Record<string, unknown>)) {
      if (validIds.has(k) && /^[A-D]$/.test(String(v))) clean[k] = String(v);
    }
    patch.answers = clean;
  }
  if (Number.isInteger(body?.currentIndex)) {
    patch.currentIndex = Math.min(
      Math.max(0, Number(body.currentIndex)),
      Math.max(0, session.questionIds.length - 1),
    );
  }
  if (Number.isInteger(body?.secondsUsed)) {
    patch.secondsUsed = Math.max(session.secondsUsed, Number(body.secondsUsed));
  }

  if (body?.status === "completed") {
    const answers = patch.answers ?? session.answers ?? {};
    const rows = session.questionIds.length
      ? await db
          .select({ id: questions.id, correct: questions.correct })
          .from(questions)
          .where(inArray(questions.id, session.questionIds))
      : [];
    const correctCount = rows.filter((r) => answers[String(r.id)] === r.correct).length;
    patch.status = "completed";
    patch.correctCount = correctCount;
    patch.answeredCount = Object.keys(answers).length;
    patch.completedAt = new Date();
  }

  await db.update(studySessions).set(patch).where(eq(studySessions.id, sessionId));
  return NextResponse.json({ ok: true, correctCount: patch.correctCount ?? null });
}

/** Abandon/delete a session. */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { id } = await ctx.params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) {
    return NextResponse.json({ error: "Bad id." }, { status: 400 });
  }
  await db
    .delete(studySessions)
    .where(and(eq(studySessions.id, sessionId), eq(studySessions.userId, user.id)));
  return NextResponse.json({ ok: true });
}
