import Link from "next/link";
import { notFound } from "next/navigation";
import { getQualificationWithSubjects } from "@/lib/data";
import { getSessionUser, isSubscribed } from "@/lib/auth";
import SubscribeButton from "@/components/SubscribeButton";

export const dynamic = "force-dynamic";

export default async function QualificationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getQualificationWithSubjects(slug);
  if (!data) notFound();
  const { qualification, subjects } = data;
  const totalQuestions = subjects.reduce((n, s) => n + s.questionCount, 0);

  const user = await getSessionUser();
  const subscribed = user ? await isSubscribed(user.id, qualification.id) : false;

  return (
    <>
      <section className="border-b border-navy-800 bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <nav className="text-xs uppercase tracking-[0.18em] text-navy-100/60">
            <Link href="/" className="hover:text-gold-400">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-gold-400">{qualification.shortName}</span>
          </nav>
          <h1 className="font-display mt-4 text-3xl font-semibold sm:text-4xl">
            {qualification.name}
          </h1>
          <p className="mt-4 max-w-2xl leading-relaxed text-navy-100/85">
            {qualification.description}
          </p>
          <p className="mt-6 text-sm text-navy-100/70">
            {subjects.length} subjects · {totalQuestions.toLocaleString("en-ZA")} questions
            in the bank
          </p>
          <div className="mt-6">
            {user ? (
              subscribed ? (
                <span className="inline-flex items-center gap-2 rounded border border-gold-500/50 bg-navy-800/60 px-4 py-2 text-sm font-semibold text-gold-400">
                  <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 8.5l3.2 3.2L13 5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  You are subscribed to this track
                </span>
              ) : (
                <SubscribeButton
                  qualificationId={qualification.id}
                  subscribed={false}
                  shortName={qualification.shortName}
                />
              )
            ) : (
              <Link
                href={`/signup?next=${encodeURIComponent(`/qualifications/${slug}`)}`}
                className="inline-block rounded bg-gold-500 px-5 py-2.5 text-sm font-semibold text-navy-950 hover:bg-gold-400"
              >
                Create an account to subscribe
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2">
          {subjects.map((s, i) => (
            <Link
              key={s.id}
              href={`/subjects/${s.id}`}
              className="group flex flex-col rounded-lg border border-line bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-600">
                    Subject {String(i + 1).padStart(2, "0")}
                  </p>
                  <h2 className="font-display mt-1 text-xl font-semibold text-navy-900">
                    {s.name}
                  </h2>
                </div>
              </div>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-soft">
                {s.description}
              </p>
              <div className="mt-5 flex items-center justify-between border-t border-line pt-4 text-sm">
                <span className="text-ink-soft">
                  {s.chapterCount > 0
                    ? `${s.chapterCount} chapter${s.chapterCount === 1 ? "" : "s"} · ${s.questionCount.toLocaleString("en-ZA")} questions`
                    : "Questions coming soon"}
                </span>
                <span className="font-semibold text-navy-800 group-hover:text-gold-600">
                  Open →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
