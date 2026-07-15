import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, users } from "@/lib/db/schema";
import { checkAdminAuth } from "@/lib/admin";
import { hashPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Super admin provisions the first (or an additional) School Admin account for a school. */
export async function POST(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const schoolId = Number(body?.schoolId);
  const name = String(body?.name ?? "").trim();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!Number.isInteger(schoolId) || schoolId <= 0) {
    return NextResponse.json({ error: "schoolId is required." }, { status: 400 });
  }
  const [school] = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId));
  if (!school) return NextResponse.json({ error: "School not found." }, { status: 404 });

  if (name.length < 2) {
    return NextResponse.json({ error: "Enter the administrator's full name." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "The password must be at least 8 characters." }, { status: 400 });
  }

  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (existing) {
    return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
  }

  const [created] = await db
    .insert(users)
    .values({
      name,
      email,
      passwordHash: hashPassword(password),
      role: "school_admin",
      schoolId,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  return NextResponse.json({ schoolAdmin: created });
}
