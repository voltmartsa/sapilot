import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { currencyItems } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const rows = await db
    .select()
    .from(currencyItems)
    .where(eq(currencyItems.userId, user.id))
    .orderBy(asc(currencyItems.dueDate));
  return NextResponse.json({ items: rows });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const label = String(body?.label ?? "").trim();
  const dueDate = new Date(String(body?.dueDate ?? ""));
  const note = String(body?.note ?? "").trim();

  if (!label) return NextResponse.json({ error: "Enter a label for this item." }, { status: 400 });
  if (Number.isNaN(dueDate.getTime())) {
    return NextResponse.json({ error: "Enter a valid due date." }, { status: 400 });
  }

  const [created] = await db
    .insert(currencyItems)
    .values({ userId: user.id, label, dueDate, note })
    .returning();
  return NextResponse.json({ item: created });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const patch: Partial<typeof currencyItems.$inferInsert> = {};
  if (body?.label !== undefined) {
    const label = String(body.label).trim();
    if (!label) return NextResponse.json({ error: "Label cannot be empty." }, { status: 400 });
    patch.label = label;
  }
  if (body?.dueDate !== undefined) {
    const dueDate = new Date(String(body.dueDate));
    if (Number.isNaN(dueDate.getTime())) {
      return NextResponse.json({ error: "Enter a valid due date." }, { status: 400 });
    }
    patch.dueDate = dueDate;
  }
  if (body?.note !== undefined) patch.note = String(body.note).trim();

  const updated = await db
    .update(currencyItems)
    .set(patch)
    .where(and(eq(currencyItems.id, id), eq(currencyItems.userId, user.id)))
    .returning();
  if (updated.length === 0) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  return NextResponse.json({ item: updated[0] });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }

  const deleted = await db
    .delete(currencyItems)
    .where(and(eq(currencyItems.id, id), eq(currencyItems.userId, user.id)))
    .returning({ id: currencyItems.id });
  if (deleted.length === 0) return NextResponse.json({ error: "Item not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
