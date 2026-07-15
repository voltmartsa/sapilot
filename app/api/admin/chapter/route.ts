import { NextRequest, NextResponse } from "next/server";
import { eq, inArray, isNotNull, and } from "drizzle-orm";
import { db } from "@/lib/db";
import { chapters, images, questions } from "@/lib/db/schema";
import { isSuperAdmin, passcodeIsValid } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const passcode = String(body?.passcode ?? "");
  if (!passcodeIsValid(passcode) && !(await isSuperAdmin())) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const chapterId = Number(body?.chapterId);
  if (!Number.isInteger(chapterId) || chapterId <= 0) {
    return NextResponse.json({ error: "chapterId is required." }, { status: 400 });
  }
  // Collect photo ids first so they can be removed after the cascade delete.
  const imageRows = await db
    .select({ imageId: questions.imageId })
    .from(questions)
    .where(and(eq(questions.chapterId, chapterId), isNotNull(questions.imageId)));
  const imageIds = imageRows
    .map((r) => r.imageId)
    .filter((id): id is number => id !== null);

  const deleted = await db
    .delete(chapters)
    .where(eq(chapters.id, chapterId))
    .returning({ id: chapters.id, name: chapters.name });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Chapter not found." }, { status: 404 });
  }
  if (imageIds.length > 0) {
    await db.delete(images).where(inArray(images.id, imageIds));
  }
  return NextResponse.json({ deleted: deleted[0] });
}
