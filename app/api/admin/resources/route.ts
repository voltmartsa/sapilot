import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files, resources, subjects } from "@/lib/db/schema";
import { checkAdminAuth, isSuperAdmin, passcodeIsValid } from "@/lib/admin";

export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

export async function GET(req: NextRequest) {
  if (!(await checkAdminAuth(req))) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const subjectId = Number(req.nextUrl.searchParams.get("subjectId"));
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    return NextResponse.json({ error: "subjectId is required." }, { status: 400 });
  }
  const rows = await db
    .select({
      id: resources.id,
      kind: resources.kind,
      title: resources.title,
      description: resources.description,
      url: resources.url,
      fileId: resources.fileId,
      createdAt: resources.createdAt,
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

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const passcode = String(form.get("passcode") ?? "");
  if (!passcodeIsValid(passcode) && !(await isSuperAdmin())) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  const subjectId = Number(form.get("subjectId"));
  if (!Number.isInteger(subjectId) || subjectId <= 0) {
    return NextResponse.json({ error: "Select a subject." }, { status: 400 });
  }
  const [subject] = await db.select({ id: subjects.id }).from(subjects).where(eq(subjects.id, subjectId));
  if (!subject) return NextResponse.json({ error: "Subject not found." }, { status: 404 });

  const kind = String(form.get("kind") ?? "");
  const title = String(form.get("title") ?? "").trim();
  const description = String(form.get("description") ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  if (kind === "link") {
    const url = String(form.get("url") ?? "").trim();
    if (!/^https?:\/\/.+/i.test(url)) {
      return NextResponse.json({ error: "Enter a valid http(s) URL." }, { status: 400 });
    }
    const [created] = await db
      .insert(resources)
      .values({ subjectId, kind: "link", title, description, url })
      .returning({ id: resources.id });
    return NextResponse.json({ resource: created });
  }

  if (kind === "document") {
    const file = form.get("file");
    if (!(file instanceof Blob) || file.size === 0) {
      return NextResponse.json({ error: "Attach a file." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "The file is larger than 15 MB." }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, Word, PowerPoint, Excel, text or image files." },
        { status: 400 },
      );
    }
    const filename = (file instanceof File && file.name) || title;
    const buffer = Buffer.from(await file.arrayBuffer());
    const [storedFile] = await db
      .insert(files)
      .values({ filename, mime: file.type, data: buffer.toString("base64"), size: file.size })
      .returning({ id: files.id });
    const [created] = await db
      .insert(resources)
      .values({ subjectId, kind: "document", title, description, fileId: storedFile.id })
      .returning({ id: resources.id });
    return NextResponse.json({ resource: created });
  }

  return NextResponse.json({ error: "kind must be 'document' or 'link'." }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const passcode = String(body?.passcode ?? "");
  if (!passcodeIsValid(passcode) && !(await isSuperAdmin())) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "id is required." }, { status: 400 });
  }
  const [existing] = await db.select({ fileId: resources.fileId }).from(resources).where(eq(resources.id, id));
  const deleted = await db.delete(resources).where(eq(resources.id, id)).returning({ id: resources.id });
  if (deleted.length === 0) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }
  if (existing?.fileId) {
    await db.delete(files).where(eq(files.id, existing.fileId));
  }
  return NextResponse.json({ ok: true });
}
