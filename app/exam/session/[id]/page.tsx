import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import ExamPlayer from "@/components/ExamPlayer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Mock examination" };

export default async function ExamSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/exam/session/${id}`)}`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <ExamPlayer sessionId={sessionId} />
    </div>
  );
}
