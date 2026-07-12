import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getSavedQuestionsForUser } from "@/lib/data";
import QuestionImage from "@/components/QuestionImage";
import RemoveSavedButton from "@/components/RemoveSavedButton";

export const dynamic = "force-dynamic";

export const metadata = { title: "Saved questions" };

export default async function DashboardSavedPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fdashboard%2Fsaved");
  const saved = await getSavedQuestionsForUser(user.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">
        Saved questions
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Questions you set aside to scrutinise later, across all your subjects — with the
        correct answer and explanation shown for study.
      </p>

      {saved.length === 0 ? (
        <div className="mt-6 rounded-lg border border-line bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-ink-soft">
            Nothing saved yet. While practising, use the{" "}
            <span className="font-semibold text-ink">Save</span> button on any question
            to keep it here.
          </p>
          <Link
            href="/dashboard/practice"
            className="mt-5 inline-block rounded bg-navy-900 px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Go to practice
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-6">
          {saved.map((q) => {
            const options: { key: string; text: string }[] = [
              { key: "A", text: q.optionA },
              { key: "B", text: q.optionB },
              ...(q.optionC ? [{ key: "C", text: q.optionC }] : []),
              ...(q.optionD ? [{ key: "D", text: q.optionD }] : []),
            ];
            return (
              <div key={q.id} className="rounded-lg border border-line bg-white shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-6 py-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-soft">
                    {q.qualificationShortName} · {q.subjectName} · {q.chapterName}
                  </span>
                  <RemoveSavedButton questionId={q.id} />
                </div>
                <div className="px-6 py-5">
                  <p className="text-sm font-medium leading-relaxed text-ink whitespace-pre-line">
                    {q.text}
                  </p>
                  {q.imageId && <QuestionImage imageId={q.imageId} />}
                  <div className="mt-4 space-y-2">
                    {options.map((o) => (
                      <div
                        key={o.key}
                        className={`flex items-start gap-3 rounded border px-4 py-2.5 text-sm ${
                          o.key === q.correct
                            ? "border-emerald-600 bg-emerald-50"
                            : "border-line"
                        }`}
                      >
                        <span className="font-display font-semibold text-navy-800">
                          {o.key}.
                        </span>
                        <span className="flex-1 whitespace-pre-line">{o.text}</span>
                        {o.key === q.correct && (
                          <span className="text-xs font-semibold uppercase text-emerald-700">
                            Correct answer
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-4 rounded border-l-4 border-gold-500 bg-paper p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-600">
                        Explanation
                      </p>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft whitespace-pre-line">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
