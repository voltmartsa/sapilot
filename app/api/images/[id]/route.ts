import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { images } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const imageId = Number(id);
  if (!Number.isInteger(imageId) || imageId <= 0) {
    return new Response("Not found", { status: 404 });
  }
  const [img] = await db.select().from(images).where(eq(images.id, imageId));
  if (!img) {
    return new Response("Not found", { status: 404 });
  }
  const bytes = Buffer.from(img.data, "base64");
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
