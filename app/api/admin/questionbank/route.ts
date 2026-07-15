import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, images, questions, subjects } from "@/lib/db/schema";
import { checkAdminAuth } from "@/lib/admin";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";

export const dynamic = "force-dynamic";

/** Filterable, paginated question list. */
export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
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

/** Edit a question in place — text, options, and optionally its photo. */
export async function PATCH(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const form = await req.formData();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Question id is required." }, { status: 400 });
  }

  const text = String(form.get("text") ?? "").trim();
  const optionA = String(form.get("optionA") ?? "").trim();
  const optionB = String(form.get("optionB") ?? "").trim();
  const optionC = String(form.get("optionC") ?? "").trim();
  const optionD = String(form.get("optionD") ?? "").trim();
  const correct = String(form.get("correct") ?? "").trim().toUpperCase();
  const explanation = String(form.get("explanation") ?? "").trim();

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

  const [existing] = await db
    .select({ imageId: questions.imageId })
    .from(questions)
    .where(eq(questions.id, id));
  if (!existing) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  let imageId = existing.imageId;
  let staleImageId: number | null = null;
  const removePhoto = form.get("removePhoto") === "true";
  const photo = form.get("photo");

  if (photo instanceof Blob && photo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(photo.type)) {
      return NextResponse.json(
        { error: "The photo must be a PNG, JPEG, GIF or WebP image." },
        { status: 400 },
      );
    }
    if (photo.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "The photo is larger than 4 MB." }, { status: 400 });
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    const [img] = await db
      .insert(images)
      .values({ mime: photo.type, data: buffer.toString("base64") })
      .returning({ id: images.id });
    staleImageId = existing.imageId;
    imageId = img.id;
  } else if (removePhoto && existing.imageId) {
    staleImageId = existing.imageId;
    imageId = null;
  }

  await db
    .update(questions)
    .set({
      text,
      optionA,
      optionB,
      optionC: optionC || null,
      optionD: optionD || null,
      correct,
      explanation,
      imageId,
    })
    .where(eq(questions.id, id));

  if (staleImageId) {
    await db.delete(images).where(eq(images.id, staleImageId));
  }

  return NextResponse.json({ ok: true, imageId });
}

/** Bulk delete: by explicit question ids, or every question in a chapter. */
export async function DELETE(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
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
