import { NextResponse } from "next/server";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { studySessions, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "instructor") {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const students = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      shareWithSchool: users.shareWithSchool,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(and(eq(users.instructorId, user.id), eq(users.role, "student")));

  if (students.length === 0) {
    return NextResponse.json({ students: [] });
  }

  const sharingIds = students.filter((s) => s.shareWithSchool).map((s) => s.id);
  const statsById = new Map<
    number,
    { correct: number; answered: number; sessions: number; lastActive: string | null }
  >();
  if (sharingIds.length > 0) {
    const agg = await db
      .select({
        userId: studySessions.userId,
        correct: sql<number>`coalesce(sum(${studySessions.correctCount}), 0)`.mapWith(Number),
        answered: sql<number>`coalesce(sum(${studySessions.answeredCount}), 0)`.mapWith(Number),
        sessions: sql<number>`count(*)`.mapWith(Number),
        lastActive: sql<string>`max(${studySessions.completedAt})`,
      })
      .from(studySessions)
      .where(and(eq(studySessions.status, "completed"), inArray(studySessions.userId, sharingIds)))
      .groupBy(studySessions.userId);
    for (const row of agg) {
      statsById.set(row.userId, {
        correct: row.correct,
        answered: row.answered,
        sessions: row.sessions,
        lastActive: row.lastActive,
      });
    }
  }

  return NextResponse.json({
    students: students.map((s) => {
      const stat = statsById.get(s.id);
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        shareWithSchool: s.shareWithSchool,
        createdAt: s.createdAt,
        accuracy: stat && stat.answered > 0 ? Math.round((stat.correct / stat.answered) * 100) : null,
        sessions: stat?.sessions ?? 0,
        lastActive: stat?.lastActive ?? null,
      };
    }),
  });
}
