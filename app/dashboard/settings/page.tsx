import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSessionUser, getSubscribedQualificationIds } from "@/lib/auth";
import { getQualifications } from "@/lib/data";
import ProfileForm from "@/components/ProfileForm";
import SubscribeButton from "@/components/SubscribeButton";
import LeaderboardToggle from "@/components/LeaderboardToggle";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import SchoolAffiliationCard from "@/components/SchoolAffiliationCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Settings" };

export default async function DashboardSettingsPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) redirect("/login?next=%2Fdashboard%2Fsettings");

  const [[profile], quals, subscribedIds] = await Promise.all([
    db
      .select({
        name: users.name,
        email: users.email,
        baseAirport: users.baseAirport,
        leaderboardOptIn: users.leaderboardOptIn,
      })
      .from(users)
      .where(eq(users.id, sessionUser.id)),
    getQualifications(),
    getSubscribedQualificationIds(sessionUser.id),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Settings</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Your details and qualification subscriptions.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-semibold text-navy-900">My details</h2>
          <div className="mt-4">
            <ProfileForm
              initialName={profile.name}
              initialBaseAirport={profile.baseAirport ?? ""}
              email={profile.email}
            />
          </div>
        </div>

        <div className="rounded-lg border border-line bg-white shadow-sm lg:self-start">
          <div className="border-b border-line px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Subscriptions
            </h2>
            <p className="mt-1 text-sm text-ink-soft">
              Only subscribed qualifications appear in your subject switcher.
            </p>
          </div>
          <ul className="divide-y divide-line">
            {quals.map((q) => {
              const isActive = subscribedIds.includes(q.id);
              return (
                <li
                  key={q.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
                >
                  <div>
                    <p className="font-display text-base font-semibold text-navy-900">
                      {q.shortName}
                      {isActive && (
                        <span className="ml-2 rounded bg-emerald-100 px-2 py-0.5 align-middle text-xs font-bold uppercase text-emerald-800">
                          Active
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-ink-soft">{q.name}</p>
                  </div>
                  <SubscribeButton
                    qualificationId={q.id}
                    subscribed={isActive}
                    shortName={q.shortName}
                  />
                </li>
              );
            })}
          </ul>
        </div>

        <ChangePasswordForm />

        <SchoolAffiliationCard />

        <div className="lg:col-span-2">
          <LeaderboardToggle initialOptIn={profile.leaderboardOptIn} />
        </div>
      </div>
    </div>
  );
}
