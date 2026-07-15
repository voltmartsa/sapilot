import { NextRequest, NextResponse } from "next/server";
import { eq, ne, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (name.length < 2) {
    return NextResponse.json({ error: "Enter a valid school name." }, { status: 400 });
  }
  const [existing] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(and(eq(schools.name, name), ne(schools.id, user.schoolId)));
  if (existing) {
    return NextResponse.json({ error: "Another school already has this name." }, { status: 409 });
  }
  await db.update(schools).set({ name }).where(eq(schools.id, user.schoolId));
  return NextResponse.json({ ok: true });
}
