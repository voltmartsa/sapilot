import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { createSession, hashPassword, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const baseAirport = String(body?.baseAirport ?? "").trim().toUpperCase();

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  }
  if (!/^FA[A-Z]{2}$/.test(baseAirport)) {
    return NextResponse.json(
      { error: "Enter your base airport as a South African ICAO code in the FA format, e.g. FALA or FACT." },
      { status: 400 },
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "The password must be at least 8 characters." },
      { status: 400 },
    );
  }

  // Optional school affiliation. Self-signup is always role="student" — school
  // and instructor accounts are provisioned by the super admin / a school admin.
  const schoolIdRaw = body?.schoolId;
  let schoolId: number | null = null;
  let shareWithSchool = false;
  if (schoolIdRaw !== undefined && schoolIdRaw !== null && schoolIdRaw !== "") {
    const parsed = Number(schoolIdRaw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return NextResponse.json({ error: "Select a valid school." }, { status: 400 });
    }
    const [school] = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, parsed));
    if (!school) {
      return NextResponse.json({ error: "That school could not be found." }, { status: 400 });
    }
    schoolId = school.id;
    shareWithSchool = !!body?.shareWithSchool;
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Sign in instead." },
      { status: 409 },
    );
  }

  const [user] = await db
    .insert(users)
    .values({
      name,
      email,
      baseAirport,
      passwordHash: hashPassword(password),
      schoolId,
      shareWithSchool,
    })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role });

  const { token, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
}
