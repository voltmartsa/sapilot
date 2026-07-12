import Link from "next/link";
import { getQualifications, getSiteStats } from "@/lib/data";

export const revalidate = 60;

const qualificationMeta: Record<string, { exams: string; focus: string }> = {
  ppl: { exams: "8 examinations", focus: "Foundation theory for the private licence" },
  cpl: { exams: "8 examinations", focus: "Professional-depth theory for commercial operations" },
  "instrument-rating": { exams: "5 subject areas", focus: "Procedures and theory for flight under IFR" },
  atpl: { exams: "9 subject areas", focus: "Airline-level theory for multi-crew command" },
};

export default async function HomePage() {
  const [quals, stats] = await Promise.all([getQualifications(), getSiteStats()]);

  return (
    <>
      {/* Hero */}
      <section className="bg-navy-900 text-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">
              PPL · CPL · Instrument Rating · ATPL
            </p>
            <h1 className="font-display mt-5 text-4xl font-semibold leading-tight sm:text-5xl">
              Prepare for your SACAA theoretical examinations the disciplined way.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-100/85">
              Work through the syllabus chapter by chapter, then sit full timed mock
              examinations under exam conditions. Every question carries a written
              explanation, so a wrong answer becomes a lesson rather than a guess.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="#qualifications"
                className="rounded bg-gold-500 px-6 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
              >
                Browse the question banks
              </Link>
              <Link
                href="/qualifications/ppl"
                className="rounded border border-navy-100/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:border-navy-100/60 hover:bg-navy-800"
              >
                Start with the PPL
              </Link>
            </div>
          </div>
          <div className="flex items-center">
            <dl className="grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-navy-700 bg-navy-700">
              {[
                { label: "Licence tracks", value: "4" },
                { label: "Examination subjects", value: String(stats.subjectCount) },
                {
                  label: "Questions in the bank",
                  value: stats.questionCount.toLocaleString("en-ZA"),
                },
                { label: "Pass standard", value: "75%" },
              ].map((item) => (
                <div key={item.label} className="bg-navy-800/80 p-6">
                  <dd className="font-display text-3xl font-semibold text-gold-400">
                    {item.value}
                  </dd>
                  <dt className="mt-1 text-xs uppercase tracking-[0.14em] text-navy-100/70">
                    {item.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Qualifications */}
      <section id="qualifications" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
            The question banks
          </p>
          <h2 className="font-display mt-3 text-3xl font-semibold text-ink">
            One bank for every stage of your licence
          </h2>
          <p className="mt-4 leading-relaxed text-ink-soft">
            Each qualification is organised into its core examination subjects, and each
            subject into the chapters of the syllabus — so you can drill exactly the
            material you are weakest on.
          </p>
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {quals.map((q) => (
            <Link
              key={q.id}
              href={`/qualifications/${q.slug}`}
              className="group rounded-lg border border-line bg-white p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-md"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-2xl font-semibold text-navy-900">
                  {q.shortName}
                </span>
                <span className="text-xs font-medium uppercase tracking-wider text-gold-600">
                  {qualificationMeta[q.slug]?.exams}
                </span>
              </div>
              <h3 className="mt-1 text-sm font-semibold uppercase tracking-[0.12em] text-ink-soft">
                {q.name}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-soft">{q.description}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-navy-800 group-hover:text-gold-600">
                View subjects
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Method */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              The method
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold text-ink">
              Study the way examiners test
            </h2>
          </div>
          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Drill by chapter",
                body: "Select a subject, pick the chapters you are revising, and work through the questions with immediate feedback after every answer.",
              },
              {
                step: "02",
                title: "Read the explanation",
                body: "Every question includes a written explanation of the correct answer, referencing the underlying theory — not just the letter of the answer.",
              },
              {
                step: "03",
                title: "Sit the mock exam",
                body: "When a subject is ready, sit a full-length timed mock under exam conditions and measure yourself against the 75% pass standard.",
              },
            ].map((item) => (
              <div key={item.step}>
                <span className="font-display text-4xl font-semibold text-navy-100">
                  {item.step}
                </span>
                <h3 className="mt-3 border-t-2 border-gold-500 pt-4 text-lg font-semibold text-ink">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">
              Syllabus coverage
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold text-ink">
              The core subjects, end to end
            </h2>
            <p className="mt-4 leading-relaxed text-ink-soft">
              From Air Law and Meteorology at PPL level through General Navigation,
              Flight Planning and Instruments &amp; Electronics at ATPL level, the bank
              follows the structure of the theoretical knowledge syllabus. Instructors
              maintain the bank directly, uploading vetted questions chapter by chapter.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Written explanation attached to every question",
                "Practice sessions filtered to the exact chapters you choose",
                "Timed mock examinations scored against the 75% pass mark",
                "Question banks maintained and expanded by instructors",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-sm text-ink">
                  <svg viewBox="0 0 20 20" className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="10" cy="10" r="8.5" opacity="0.35" />
                    <path d="M6.5 10.5l2.4 2.4 4.8-5.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-line bg-white p-8 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
              Subjects by qualification
            </h3>
            <div className="mt-6 space-y-5">
              {quals.map((q) => (
                <div key={q.id} className="flex items-center justify-between border-b border-line pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-display text-lg font-semibold text-navy-900">
                      {q.shortName}
                    </p>
                    <p className="text-xs text-ink-soft">{qualificationMeta[q.slug]?.focus}</p>
                  </div>
                  <Link
                    href={`/qualifications/${q.slug}`}
                    className="rounded border border-navy-800 px-4 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-navy-900 hover:text-white"
                  >
                    Open bank
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="bg-navy-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              The examination room rewards preparation.
            </h2>
            <p className="mt-2 max-w-xl text-navy-100/80">
              Choose your licence track and begin working the bank today.
            </p>
          </div>
          <Link
            href="#qualifications"
            className="shrink-0 rounded bg-gold-500 px-6 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
          >
            Choose a qualification
          </Link>
        </div>
      </section>
    </>
  );
}
