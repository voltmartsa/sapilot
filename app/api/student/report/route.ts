import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { questions, reports } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const questionId = Number(body?.questionId);
  const reason = String(body?.reason ?? "").trim();

  if (!Number.isInteger(questionId) || questionId <= 0) {
    return NextResponse.json({ error: "questionId is required." }, { status: 400 });
  }
  if (reason.length < 5) {
    return NextResponse.json(
      { error: "Describe the problem in a few words so the instructor can check it." },
      { status: 400 },
    );
  }
  if (reason.length > 2000) {
    return NextResponse.json({ error: "The report is too long." }, { status: 400 });
  }
  const [q] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.id, questionId));
  if (!q) {
    return NextResponse.json({ error: "Question not found." }, { status: 404 });
  }

  const [created] = await db
    .insert(reports)
    .values({ userId: user.id, questionId, reason })
    .returning({ id: reports.id });
  return NextResponse.json({ report: created });
}
