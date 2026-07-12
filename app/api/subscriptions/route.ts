import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { qualifications, subscriptions } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const rows = await db
    .select({ qualificationId: subscriptions.qualificationId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id));
  return NextResponse.json({ qualificationIds: rows.map((r) => r.qualificationId) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const qualificationId = Number(body?.qualificationId);
  const action = String(body?.action ?? "subscribe"); // subscribe | unsubscribe

  if (!Number.isInteger(qualificationId) || qualificationId <= 0) {
    return NextResponse.json({ error: "qualificationId is required." }, { status: 400 });
  }
  const [qual] = await db
    .select({ id: qualifications.id })
    .from(qualifications)
    .where(eq(qualifications.id, qualificationId));
  if (!qual) {
    return NextResponse.json({ error: "Qualification not found." }, { status: 404 });
  }

  if (action === "unsubscribe") {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, user.id),
          eq(subscriptions.qualificationId, qualificationId),
        ),
      );
    return NextResponse.json({ subscribed: false });
  }

  await db
    .insert(subscriptions)
    .values({ userId: user.id, qualificationId })
    .onConflictDoNothing();
  return NextResponse.json({ subscribed: true });
}
