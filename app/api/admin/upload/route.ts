import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, questions, subjects } from "@/lib/db/schema";
import { parseQuestionWorkbook } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const passcode = String(form.get("passcode") ?? "");
  if (!process.env.ADMIN_PASSCODE || passcode !== process.env.ADMIN_PASSCODE) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const subjectId = Number(form.get("subjectId"));
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    return NextResponse.json({ error: "Select a subject." }, { status: 400 });
  }
  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, subjectId));
  if (!subject) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }

  const existingChapterId = Number(form.get("chapterId"));
  const newChapterName = String(form.get("newChapterName") ?? "").trim();

  const file = form.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return NextResponse.json({ error: "Attach an Excel file." }, { status: 400 });
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "File is larger than 10 MB." }, { status: 400 });
  }

  // Resolve the chapter: an existing one, or create/find by name.
  let chapter: { id: number; name: string } | undefined;
  if (Number.isInteger(existingChapterId) && existingChapterId > 0) {
    const [row] = await db
      .select({ id: chapters.id, name: chapters.name })
      .from(chapters)
      .where(and(eq(chapters.id, existingChapterId), eq(chapters.subjectId, subjectId)));
    if (!row) {
      return NextResponse.json(
        { error: "Chapter not found for this subject." },
        { status: 404 },
      );
    }
    chapter = row;
  } else if (newChapterName) {
    const inserted = await db
      .insert(chapters)
      .values({ subjectId, name: newChapterName })
      .onConflictDoNothing()
      .returning({ id: chapters.id, name: chapters.name });
    if (inserted.length > 0) {
      chapter = inserted[0];
    } else {
      const [row] = await db
        .select({ id: chapters.id, name: chapters.name })
        .from(chapters)
        .where(and(eq(chapters.subjectId, subjectId), eq(chapters.name, newChapterName)));
      chapter = row;
    }
  }
  if (!chapter) {
    return NextResponse.json(
      { error: "Choose an existing chapter or provide a new chapter name." },
      { status: 400 },
    );
  }

  let parsed;
  try {
    parsed = parseQuestionWorkbook(await file.arrayBuffer());
  } catch {
    return NextResponse.json(
      { error: "The file could not be read as an Excel workbook (.xlsx, .xls or .csv)." },
      { status: 400 },
    );
  }

  const CHUNK = 100;
  let inserted = 0;
  for (let i = 0; i < parsed.questions.length; i += CHUNK) {
    const chunk = parsed.questions.slice(i, i + CHUNK).map((q) => ({
      chapterId: chapter.id,
      text: q.text,
      optionA: q.optionA,
      optionB: q.optionB,
      optionC: q.optionC,
      optionD: q.optionD,
      correct: q.correct,
      explanation: q.explanation,
    }));
    await db.insert(questions).values(chunk);
    inserted += chunk.length;
  }

  return NextResponse.json({
    inserted,
    totalRows: parsed.totalRows,
    errors: parsed.errors,
    chapter,
    subject: { id: subject.id, name: subject.name },
  });
}
