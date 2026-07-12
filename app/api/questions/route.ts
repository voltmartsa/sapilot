import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, questions, subjects } from "@/lib/db/schema";
import { getSessionUser, isSubscribed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const subjectId = Number(params.get("subjectId"));
  if (!Number.isInteger(subjectId)) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in to access the question bank.", code: "auth" },
      { status: 401 },
    );
  }
  const [subject] = await db
    .select({ qualificationId: subjects.qualificationId })
    .from(subjects)
    .where(eq(subjects.id, subjectId));
  if (!subject) {
    return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  }
  if (!(await isSubscribed(user.id, subject.qualificationId))) {
    return NextResponse.json(
      { error: "Subscribe to this qualification to access its question bank.", code: "subscription" },
      { status: 403 },
    );
  }

  const chapterIds = (params.get("chapters") ?? "")
    .split(",")
    .map((s) => Number(s))
    .filter((n) => Number.isInteger(n) && n > 0);

  const rawLimit = Number(params.get("limit"));
  const limit =
    Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 200) : 200;

  const conditions = [eq(chapters.subjectId, subjectId)];
  if (chapterIds.length > 0) {
    conditions.push(inArray(questions.chapterId, chapterIds));
  }

  const rows = await db
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
    .innerJoin(chapters, eq(questions.chapterId, chapters.id))
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(limit);

  return NextResponse.json({ questions: rows });
}
