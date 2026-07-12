import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, images, questions, reports, subjects, users } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

function checkPasscode(req: NextRequest): boolean {
  const passcode = req.headers.get("x-admin-passcode") ?? "";
  return !!process.env.ADMIN_PASSCODE && passcode === process.env.ADMIN_PASSCODE;
}

export async function GET(req: NextRequest) {
  if (!checkPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      studentName: users.name,
      studentEmail: users.email,
      questionId: questions.id,
      questionText: questions.text,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correct: questions.correct,
      explanation: questions.explanation,
      imageId: questions.imageId,
      chapterName: chapters.name,
      subjectName: subjects.name,
      subjectId: subjects.id,
    })
    .from(reports)
    .innerJoin(users, eq(users.id, reports.userId))
    .innerJoin(questions, eq(questions.id, reports.questionId))
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .innerJoin(subjects, eq(subjects.id, chapters.subjectId))
    .orderBy(desc(reports.createdAt));
  return NextResponse.json({ reports: rows });
}

export async function PATCH(req: NextRequest) {
  if (!checkPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const reportId = Number(body?.reportId);
  const action = String(body?.action ?? ""); // resolve | dismiss | delete-question

  if (!Number.isInteger(reportId) || reportId <= 0) {
    return NextResponse.json({ error: "reportId is required." }, { status: 400 });
  }
  const [report] = await db.select().from(reports).where(eq(reports.id, reportId));
  if (!report) {
    return NextResponse.json({ error: "Report not found." }, { status: 404 });
  }

  if (action === "resolve" || action === "dismiss") {
    await db
      .update(reports)
      .set({ status: action === "resolve" ? "resolved" : "dismissed" })
      .where(eq(reports.id, reportId));
    return NextResponse.json({ ok: true });
  }

  if (action === "delete-question") {
    const [q] = await db
      .select({ id: questions.id, imageId: questions.imageId })
      .from(questions)
      .where(eq(questions.id, report.questionId));
    if (q) {
      // Deleting the question cascades to this report (and any others on it).
      await db.delete(questions).where(eq(questions.id, q.id));
      if (q.imageId) {
        await db.delete(images).where(eq(images.id, q.imageId));
      }
    }
    return NextResponse.json({ ok: true, questionDeleted: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
