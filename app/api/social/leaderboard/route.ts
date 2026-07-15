import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { qualifications, studySessions, subjects, subscriptions, users } from "@/lib/db/schema";
import { getSessionUser, isSubscribed } from "@/lib/auth";

export const dynamic = "force-dynamic";

type Ranked = {
  userId: number;
  firstName: string;
  leaderboardOptIn: boolean;
  correct: number;
  answered: number;
  sessions: number;
  accuracy: number;
  rank: number;
};

function firstNameOf(name: string): string {
  const trimmed = name.trim();
  return trimmed.split(/\s+/)[0] || trimmed || "Student";
}

/**
 * Opt-in leaderboard: ranks students subscribed to a qualification by correct
 * answers over the last week or month. Only opted-in students' rows are ever
 * returned to other students — the caller's own row is always included for
 * them alone, even if they haven't opted in, so they can see where they'd rank.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const qualificationId = Number(req.nextUrl.searchParams.get("qualificationId"));
  const period = req.nextUrl.searchParams.get("period") === "month" ? "month" : "week";
  if (!Number.isInteger(qualificationId) || qualificationId <= 0) {
    return NextResponse.json({ error: "qualificationId is required." }, { status: 400 });
  }
  if (!(await isSubscribed(user.id, qualificationId))) {
    return NextResponse.json(
      { error: "Subscribe to this qualification to see its leaderboard.", code: "subscription" },
      { status: 403 },
    );
  }
  const [qualification] = await db
    .select({ id: qualifications.id, shortName: qualifications.shortName, name: qualifications.name })
    .from(qualifications)
    .where(eq(qualifications.id, qualificationId));
  if (!qualification) {
    return NextResponse.json({ error: "Qualification not found." }, { status: 404 });
  }

  const cutoff = new Date(Date.now() - (period === "month" ? 30 : 7) * 24 * 60 * 60 * 1000);

  const subscriberRows = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.qualificationId, qualificationId));
  const subscriberIds = subscriberRows.map((r) => r.userId);
  if (subscriberIds.length === 0) {
    return NextResponse.json({
      qualification,
      period,
      totalRanked: 0,
      top: [],
      you: null,
    });
  }

  const sessionRows = await db
    .select({
      userId: studySessions.userId,
      correctCount: studySessions.correctCount,
      answeredCount: studySessions.answeredCount,
    })
    .from(studySessions)
    .innerJoin(subjects, eq(subjects.id, studySessions.subjectId))
    .where(
      and(
        inArray(studySessions.userId, subscriberIds),
        eq(studySessions.status, "completed"),
        eq(subjects.qualificationId, qualificationId),
        gte(studySessions.completedAt, cutoff),
      ),
    );

  const totals = new Map<number, { correct: number; answered: number; sessions: number }>();
  for (const row of sessionRows) {
    const t = totals.get(row.userId) ?? { correct: 0, answered: 0, sessions: 0 };
    t.correct += row.correctCount ?? 0;
    t.answered += row.answeredCount ?? 0;
    t.sessions += 1;
    totals.set(row.userId, t);
  }

  if (totals.size === 0) {
    return NextResponse.json({
      qualification,
      period,
      totalRanked: 0,
      top: [],
      you: null,
    });
  }

  const activeIds = [...totals.keys()];
  const nameRows = await db
    .select({ id: users.id, name: users.name, leaderboardOptIn: users.leaderboardOptIn })
    .from(users)
    .where(inArray(users.id, activeIds));
  const nameById = new Map(nameRows.map((r) => [r.id, r]));

  const ranked: Ranked[] = activeIds
    .map((uid) => {
      const t = totals.get(uid)!;
      const person = nameById.get(uid);
      return {
        userId: uid,
        firstName: firstNameOf(person?.name ?? "Student"),
        leaderboardOptIn: person?.leaderboardOptIn ?? false,
        correct: t.correct,
        answered: t.answered,
        sessions: t.sessions,
        accuracy: t.answered > 0 ? Math.round((t.correct / t.answered) * 100) : 0,
        rank: 0,
      };
    })
    .sort((a, b) => b.correct - a.correct || b.accuracy - a.accuracy || b.answered - a.answered)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const publicTop = ranked
    .filter((r) => r.leaderboardOptIn)
    .slice(0, 20)
    .map((r) => ({
      rank: r.rank,
      firstName: r.firstName,
      correct: r.correct,
      accuracy: r.accuracy,
      sessions: r.sessions,
      isYou: r.userId === user.id,
    }));

  const mine = ranked.find((r) => r.userId === user.id) ?? null;
  const you = mine && {
    rank: mine.rank,
    correct: mine.correct,
    accuracy: mine.accuracy,
    sessions: mine.sessions,
    optedIn: mine.leaderboardOptIn,
    inTop: publicTop.some((r) => r.isYou),
  };

  return NextResponse.json({
    qualification,
    period,
    totalRanked: ranked.length,
    top: publicTop,
    you,
  });
}
