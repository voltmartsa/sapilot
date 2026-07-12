import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectDetail } from "@/lib/data";
import { getSessionUser, isSubscribed } from "@/lib/auth";
import SubjectLauncher from "@/components/SubjectLauncher";
import AccessGate from "@/components/AccessGate";

export const dynamic = "force-dynamic";

export default async function SubjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const subjectId = Number(id);
  if (!Number.isInteger(subjectId)) notFound();
  const data = await getSubjectDetail(subjectId);
  if (!data) notFound();
  const { subject, qualification, chapters } = data;
  const totalQuestions = chapters.reduce((n, c) => n + c.questionCount, 0);

  const user = await getSessionUser();
  const subscribed = user ? await isSubscribed(user.id, qualification.id) : false;

  return (
    <>
      <section className="border-b border-navy-800 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <nav className="text-xs uppercase tracking-[0.18em] text-navy-100/60">
            <Link href="/" className="hover:text-gold-400">Home</Link>
            <span className="mx-2">/</span>
            <Link href={`/qualifications/${qualification.slug}`} className="hover:text-gold-400">
              {qualification.shortName}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gold-400">{subject.name}</span>
          </nav>
          <h1 className="font-display mt-4 text-3xl font-semibold">{subject.name}</h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-navy-100/85">
            {subject.description}
          </p>
          <p className="mt-4 text-sm text-navy-100/70">
            {chapters.length} chapter{chapters.length === 1 ? "" : "s"} ·{" "}
            {totalQuestions.toLocaleString("en-ZA")} questions · pass mark {subject.passMark}%
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        {!user || !subscribed ? (
          <AccessGate
            signedIn={!!user}
            qualification={{
              id: qualification.id,
              shortName: qualification.shortName,
              name: qualification.name,
            }}
            returnTo={`/subjects/${subjectId}`}
          />
        ) : totalQuestions === 0 ? (
          <div className="rounded-lg border border-line bg-white p-10 text-center shadow-sm">
            <h2 className="font-display text-xl font-semibold text-navy-900">
              This bank is being prepared
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
              Questions for {subject.name} have not been published yet. Instructors upload
              new material chapter by chapter — check back shortly.
            </p>
            <Link
              href={`/qualifications/${qualification.slug}`}
              className="mt-6 inline-block rounded border border-navy-800 px-5 py-2 text-sm font-semibold text-navy-800 hover:bg-navy-900 hover:text-white"
            >
              Back to {qualification.shortName} subjects
            </Link>
          </div>
        ) : (
          <SubjectLauncher
            subject={{
              id: subject.id,
              name: subject.name,
              examQuestions: subject.examQuestions,
              examMinutes: subject.examMinutes,
              passMark: subject.passMark,
            }}
            chapters={chapters.filter((c) => c.questionCount > 0)}
          />
        )}
      </section>
    </>
  );
}
