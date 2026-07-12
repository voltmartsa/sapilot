import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import PracticePlayer from "@/components/PracticePlayer";

export const dynamic = "force-dynamic";

export const metadata = { title: "Practice session" };

export default async function PracticeSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessionId = Number(id);
  if (!Number.isInteger(sessionId)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/practice/session/${id}`)}`);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PracticePlayer sessionId={sessionId} />
    </div>
  );
}
