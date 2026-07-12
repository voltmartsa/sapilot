import { buildTemplateWorkbook } from "@/lib/excel";

export const dynamic = "force-dynamic";

export async function GET() {
  const buffer = buildTemplateWorkbook();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="question-upload-template.xlsx"',
    },
  });
}
