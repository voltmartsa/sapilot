import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const fileId = Number(id);
  if (!Number.isInteger(fileId) || fileId <= 0) {
    return new Response("Not found", { status: 404 });
  }
  const [file] = await db.select().from(files).where(eq(files.id, fileId));
  if (!file) {
    return new Response("Not found", { status: 404 });
  }
  const bytes = Buffer.from(file.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": file.mime,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
