import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, savedQuestions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const rows = await db
    .select({ questionId: savedQuestions.questionId })
    .from(savedQuestions)
    .where(eq(savedQuestions.userId, user.id));
  return NextResponse.json({ questionIds: rows.map((r) => r.questionId) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const questionId = Number(body?.questionId);
  if (!Number.isInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  const [q] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.id, questionId));
  if (!q) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }
  await db
    .insert(savedQuestions)
    .values({ userId: user.id, questionId })
    .onConflictDoNothing();
  return NextResponse.json({ saved: true });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const questionId = Number(body?.questionId);
  if (!Number.isInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  await db
    .delete(savedQuestions)
    .where(
      and(
        eq(savedQuestions.userId, user.id),
        eq(savedQuestions.questionId, questionId),
      ),
    );
  return NextResponse.json({ saved: false });
}
