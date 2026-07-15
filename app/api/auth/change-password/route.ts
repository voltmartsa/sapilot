import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = String(body?.currentPassword ?? "");
  const newPassword = String(body?.newPassword ?? "");

  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "The new password must be at least 8 characters." },
      { status: 400 },
    );
  }

  const [row] = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, user.id));
  if (!row || !verifyPassword(currentPassword, row.passwordHash)) {
    return NextResponse.json({ error: "Your current password is incorrect." }, { status: 401 });
  }

  await db.update(users).set({ passwordHash: hashPassword(newPassword) }).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
