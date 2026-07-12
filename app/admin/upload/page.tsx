import { getAdminTree } from "@/lib/data";
import AdminUpload from "@/components/AdminUpload";

export const dynamic = "force-dynamic";

export default async function AdminUploadPage() {
  const tree = await getAdminTree();
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        Add questions
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Upload an Excel workbook into a chapter, or create a single question with an
        optional photo.
      </p>
      <div className="mt-6">
        <AdminUpload tree={tree} />
      </div>
    </div>
  );
}
