import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, resources, subjects } from "@/lib/db/schema";
import { getSessionUser, isSubscribed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const subjectId = Number(req.nextUrl.searchParams.get("subjectId"));
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  }
  const [subject] = await db.select().from(subjects).where(eq(subjects.id, subjectId));
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });
  if (!(await isSubscribed(user.id, subject.qualificationId))) {
    return NextResponse.json({ error: "Not subscribed.", code: "subscription" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: resources.id,
      kind: resources.kind,
      title: resources.title,
      description: resources.description,
      url: resources.url,
      fileId: resources.fileId,
      filename: files.filename,
      mime: files.mime,
      size: files.size,
    })
    .from(resources)
    .leftJoin(files, eq(files.id, resources.fileId))
    .where(eq(resources.subjectId, subjectId))
    .orderBy(resources.sortOrder, resources.id);

  return NextResponse.json({ resources: rows });
}
