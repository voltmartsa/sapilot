import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Public list of schools, for the "affiliated student" signup flow. */
export async function GET() {
  const rows = await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .orderBy(asc(schools.name));
  return NextResponse.json({ schools: rows });
}
