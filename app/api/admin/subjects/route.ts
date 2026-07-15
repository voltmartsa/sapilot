import { NextRequest, NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, qualifications, questions, subjects } from "@/lib/db/schema";
import { checkAdminAuth } from "@/lib/admin";

export const dynamic = "force-dynamic";

/** Full subject/chapter tree with exam settings, for the admin Subjects & Exams pages. */
export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const quals = await db.select().from(qualifications).orderBy(qualifications.sortOrder);
  const subjectRows = await db
    .select({
      id: subjects.id,
      qualificationId: subjects.qualificationId,
      name: subjects.name,
      description: subjects.description,
      examQuestions: subjects.examQuestions,
      examMinutes: subjects.examMinutes,
      passMark: subjects.passMark,
      sortOrder: subjects.sortOrder,
    })
    .from(subjects)
    .orderBy(subjects.sortOrder);
  const chapterRows = await db
    .select({
      id: chapters.id,
      subjectId: chapters.subjectId,
      name: chapters.name,
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(chapters)
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .groupBy(chapters.id)
    .orderBy(chapters.sortOrder, chapters.name);

  return NextResponse.json({
    qualifications: quals.map((q) => ({
      id: q.id,
      shortName: q.shortName,
      name: q.name,
      subjects: subjectRows
        .filter((s) => s.qualificationId === q.id)
        .map((s) => ({
          ...s,
          chapters: chapterRows.filter((c) => c.subjectId === s.id),
        })),
    })),
  });
}

/** Update a subject's details or exam configuration, or rename a chapter. */
export async function PATCH(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);

  if (Number.isInteger(body?.chapterId)) {
    const name = String(body?.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Chapter name is required." }, { status: 400 });
    const updated = await db
      .update(chapters)
      .set({ name })
      .where(eq(chapters.id, Number(body.chapterId)))
      .returning({ id: chapters.id });
    if (updated.length === 0) {
      return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  const subjectId = Number(body?.subjectId);
  if (!Number.isInteger(subjectId)) {
    return NextResponse.json({ error: "subjectId or chapterId is required." }, { status: 400 });
  }
  const patch: Partial<typeof subjects.$inferInsert> = {};
  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty." }, { status: 400 });
    patch.name = name;
  }
  if (body?.description !== undefined) patch.description = String(body.description).trim();
  for (const field of ["examQuestions", "examMinutes", "passMark"] as const) {
    if (body?.[field] !== undefined) {
      const n = Number(body[field]);
      if (!Number.isInteger(n) || n < 1 || n > (field === "passMark" ? 100 : 500)) {
        return NextResponse.json({ error: `Invalid value for ${field}.` }, { status: 400 });
      }
      patch[field] = n;
    }
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }
  const updated = await db
    .update(subjects)
    .set(patch)
    .where(eq(subjects.id, subjectId))
    .returning({ id: subjects.id });
  if (updated.length === 0) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
