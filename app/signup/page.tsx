import AuthForm from "@/components/AuthForm";

export const metadata = { title: "Create an account" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <AuthForm mode="signup" next={next} />
    </div>
  );
}
