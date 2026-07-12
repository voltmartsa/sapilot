import { NextRequest, NextResponse } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  qualifications,
  studySessions,
  subscriptions,
  users,
} from "@/lib/db/schema";
import { checkAdminPasscode } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      baseAirport: users.baseAirport,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  const subs = await db
    .select({
      userId: subscriptions.userId,
      shortName: qualifications.shortName,
    })
    .from(subscriptions)
    .innerJoin(qualifications, eq(qualifications.id, subscriptions.qualificationId));

  const sessionAgg = await db
    .select({
      userId: studySessions.userId,
      sessions: sql<number>`count(*)`.mapWith(Number),
      answered: sql<number>`coalesce(sum(${studySessions.answeredCount}), 0)`.mapWith(Number),
      correct: sql<number>`coalesce(sum(${studySessions.correctCount}), 0)`.mapWith(Number),
    })
    .from(studySessions)
    .groupBy(studySessions.userId);
  const aggByUser = new Map(sessionAgg.map((a) => [a.userId, a]));

  return NextResponse.json({
    users: rows.map((u) => {
      const agg = aggByUser.get(u.id);
      return {
        ...u,
        subscriptions: subs.filter((s) => s.userId === u.id).map((s) => s.shortName),
        sessions: agg?.sessions ?? 0,
        answered: agg?.answered ?? 0,
        accuracy:
          agg && agg.answered > 0 ? Math.round((agg.correct / agg.answered) * 100) : null,
      };
    }),
  });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminPasscode(req)) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const userId = Number(body?.userId);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  const deleted = await db
    .delete(users)
    .where(eq(users.id, userId))
    .returning({ id: users.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
