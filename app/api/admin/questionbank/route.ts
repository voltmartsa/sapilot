import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, images, questions, subjects } from "@/lib/db/schema";
import { checkAdminPasscode } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Filterable, paginated question list. */
export async function GET(req: NextRequest) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const p = req.nextUrl.searchParams;
  const conditions = [];

  const subjectId = Number(p.get("subjectId"));
  if (Number.isInteger(subjectId) && subjectId > 0) {
    conditions.push(eq(chapters.subjectId, subjectId));
  }
  const chapterId = Number(p.get("chapterId"));
  if (Number.isInteger(chapterId) && chapterId > 0) {
    conditions.push(eq(questions.chapterId, chapterId));
  }
  const search = (p.get("search") ?? "").trim();
  if (search) {
    conditions.push(ilike(questions.text, `%${search}%`));
  }

  const page = Math.max(Number(p.get("page")) || 1, 1);
  const pageSize = 20;
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countRow] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(questions)
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .where(where);

  const rows = await db
    .select({
      id: questions.id,
      text: questions.text,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correct: questions.correct,
      explanation: questions.explanation,
      imageId: questions.imageId,
      createdAt: questions.createdAt,
      chapterId: chapters.id,
      chapterName: chapters.name,
      subjectId: subjects.id,
      subjectName: subjects.name,
    })
    .from(questions)
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .innerJoin(subjects, eq(subjects.id, chapters.subjectId))
    .where(where)
    .orderBy(desc(questions.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return NextResponse.json({
    questions: rows,
    total: countRow.total,
    page,
    pageSize,
  });
}

/** Edit a question in place. */
export async function PATCH(req: NextRequest) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Question id is required." }, { status: 400 });
  }

  const text = String(body?.text ?? "").trim();
  const optionA = String(body?.optionA ?? "").trim();
  const optionB = String(body?.optionB ?? "").trim();
  const optionC = String(body?.optionC ?? "").trim();
  const optionD = String(body?.optionD ?? "").trim();
  const correct = String(body?.correct ?? "").trim().toUpperCase();
  const explanation = String(body?.explanation ?? "").trim();

  if (!text || !optionA || !optionB) {
    return NextResponse.json(
      { error: "Question text and options A and B are required." },
      { status: 400 },
    );
  }
  const options: Record<string, string> = { A: optionA, B: optionB };
  if (optionC) options.C = optionC;
  if (optionD) options.D = optionD;
  if (!/^[A-D]$/.test(correct) || !options[correct]) {
    return NextResponse.json(
      { error: "The correct answer must be one of the filled-in options." },
      { status: 400 },
    );
  }

  const updated = await db
    .update(questions)
    .set({
      text,
      optionA,
      optionB,
      optionC: optionC || null,
      optionD: optionD || null,
      correct,
      explanation,
    })
    .where(eq(questions.id, id))
    .returning({ id: questions.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

/** Bulk delete: by explicit question ids, or every question in a chapter. */
export async function DELETE(req: NextRequest) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);

  let targetIds: number[] = [];
  if (Array.isArray(body?.questionIds)) {
    targetIds = body.questionIds
      .map(Number)
      .filter((n: number) => Number.isInteger(n) && n > 0);
  } else if (Number.isInteger(body?.chapterId)) {
    const rows = await db
      .select({ id: questions.id })
      .from(questions)
      .where(eq(questions.chapterId, Number(body.chapterId)));
    targetIds = rows.map((r) => r.id);
  }
  if (targetIds.length === 0) {
    return NextResponse.json({ error: "Nothing to delete." }, { status: 400 });
  }

  // Collect attached photos first so they can be removed after the questions.
  const imageRows = await db
    .select({ imageId: questions.imageId })
    .from(questions)
    .where(and(inArray(questions.id, targetIds), isNotNull(questions.imageId)));
  const imageIds = imageRows
    .map((r) => r.imageId)
    .filter((n): n is number => n !== null);

  const deleted = await db
    .delete(questions)
    .where(inArray(questions.id, targetIds))
    .returning({ id: questions.id });
  if (imageIds.length > 0) {
    await db.delete(images).where(inArray(images.id, imageIds));
  }

  return NextResponse.json({ deleted: deleted.length });
}
