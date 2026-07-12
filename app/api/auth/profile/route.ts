import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      baseAirport: users.baseAirport,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, user.id));
  return NextResponse.json({ profile: row });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const patch: { name?: string; baseAirport?: string } = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
    }
    patch.name = name;
  }
  if (body?.baseAirport !== undefined) {
    const code = String(body.baseAirport).trim().toUpperCase();
    if (!/^FA[A-Z]{2}$/.test(code)) {
      return NextResponse.json(
        { error: "Base airport must be a South African ICAO code in the FA format, e.g. FALA or FACT." },
        { status: 400 },
      );
    }
    patch.baseAirport = code;
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
  }

  await db.update(users).set(patch).where(eq(users.id, user.id));
  return NextResponse.json({ ok: true });
}
