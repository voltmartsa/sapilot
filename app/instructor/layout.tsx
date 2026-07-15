import { redirect } from "next/navigation";
import { getSessionUser, roleHomePath } from "@/lib/auth";
import InstructorShell from "@/components/instructor/InstructorShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Instructor Portal" };

export default async function InstructorLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Finstructor");
  if (user.role !== "instructor") redirect(roleHomePath(user.role));
  return <InstructorShell>{children}</InstructorShell>;
}
