import { NextRequest, NextResponse } from "next/server";
import { eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, SESSION_COOKIE, sessionCookieOptions, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  // Most accounts log in with email; the super admin account logs in with a
  // username instead (it has no real inbox), so accept either identifier here.
  const identifier = String(body?.email ?? "").trim();
  const password = String(body?.password ?? "");

  const [user] = identifier
    ? await db
        .select()
        .from(users)
        .where(
          or(
            eq(users.email, identifier.toLowerCase()),
            sql`lower(${users.username}) = lower(${identifier})`,
          ),
        )
    : [];
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json(
      { error: "Incorrect email/username or password." },
      { status: 401 },
    );
  }

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
