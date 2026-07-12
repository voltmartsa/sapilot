import Link from "next/link";
import SubscribeButton from "./SubscribeButton";

/**
 * Card shown in place of gated content when the visitor is not signed in
 * or not subscribed to the qualification.
 */
export default function AccessGate({
  signedIn,
  qualification,
  returnTo,
}: {
  signedIn: boolean;
  qualification: { id: number; shortName: string; name: string };
  returnTo: string;
}) {
  return (
    <div className="rounded-lg border border-line bg-white p-10 text-center shadow-sm">
      {!signedIn ? (
        <>
          <h2 className="font-display text-xl font-semibold text-navy-900">
            Sign in to access this question bank
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Create a free student account, subscribe to the {qualification.name} track,
            and your practice sessions, saved questions and mock exams will be ready
            whenever you are.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/signup?next=${encodeURIComponent(returnTo)}`}
              className="rounded bg-gold-500 px-6 py-2.5 text-sm font-semibold text-navy-950 hover:bg-gold-400"
            >
              Create an account
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(returnTo)}`}
              className="rounded border border-navy-800 px-6 py-2.5 text-sm font-semibold text-navy-800 hover:bg-navy-50"
            >
              Sign in
            </Link>
          </div>
        </>
      ) : (
        <>
          <h2 className="font-display text-xl font-semibold text-navy-900">
            Subscribe to the {qualification.shortName} track
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink-soft">
            Your account is not yet subscribed to {qualification.name}. Subscribe to
            unlock every subject, chapter and mock examination in this track.
          </p>
          <div className="mt-6 flex justify-center">
            <SubscribeButton
              qualificationId={qualification.id}
              subscribed={false}
              shortName={qualification.shortName}
            />
          </div>
        </>
      )}
    </div>
  );
}
