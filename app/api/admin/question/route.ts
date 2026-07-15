import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, images, questions, subjects } from "@/lib/db/schema";
import { isSuperAdmin, passcodeIsValid } from "@/lib/admin";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/lib/images";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const passcode = String(form.get("passcode") ?? "");
  if (!passcodeIsValid(passcode) && !(await isSuperAdmin())) {
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

  const text = String(form.get("text") ?? "").trim();
  const optionA = String(form.get("optionA") ?? "").trim();
  const optionB = String(form.get("optionB") ?? "").trim();
  const optionC = String(form.get("optionC") ?? "").trim();
  const optionD = String(form.get("optionD") ?? "").trim();
  const correct = String(form.get("correct") ?? "").trim().toUpperCase();
  const explanation = String(form.get("explanation") ?? "").trim();

  if (!text) {
    return NextResponse.json({ error: "Question text is required." }, { status: 400 });
  }
  if (!optionA || !optionB) {
    return NextResponse.json(
      { error: "Options A and B are both required." },
      { status: 400 },
    );
  }
  const options: Record<string, string> = { A: optionA, B: optionB };
  if (optionC) options.C = optionC;
  if (optionD) options.D = optionD;
  if (!/^[A-D]$/.test(correct) || !options[correct]) {
    return NextResponse.json(
      { error: "The correct answer must be one of the filled-in options A–D." },
      { status: 400 },
    );
  }

  // Resolve the chapter: an existing one, or create/find by name.
  const existingChapterId = Number(form.get("chapterId"));
  const newChapterName = String(form.get("newChapterName") ?? "").trim();
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

  // Optional photo attached to the question.
  let imageId: number | null = null;
  const photo = form.get("photo");
  if (photo instanceof Blob && photo.size > 0) {
    if (!ALLOWED_IMAGE_TYPES.has(photo.type)) {
      return NextResponse.json(
        { error: "The photo must be a PNG, JPEG, GIF or WebP image." },
        { status: 400 },
      );
    }
    if (photo.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "The photo is larger than 4 MB." },
        { status: 400 },
      );
    }
    const buffer = Buffer.from(await photo.arrayBuffer());
    const [img] = await db
      .insert(images)
      .values({ mime: photo.type, data: buffer.toString("base64") })
      .returning({ id: images.id });
    imageId = img.id;
  }

  const [created] = await db
    .insert(questions)
    .values({
      chapterId: chapter.id,
      imageId,
      text,
      optionA,
      optionB,
      optionC: optionC || null,
      optionD: optionD || null,
      correct,
      explanation,
    })
    .returning({ id: questions.id });

  return NextResponse.json({
    question: { id: created.id, imageId },
    chapter,
    subject: { id: subject.id, name: subject.name },
  });
}
