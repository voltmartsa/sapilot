import { redirect } from "next/navigation";
import { getSessionUser, roleHomePath } from "@/lib/auth";
import SchoolShell from "@/components/school/SchoolShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "School Portal" };

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fschool");
  if (user.role !== "school_admin") redirect(roleHomePath(user.role));
  return <SchoolShell>{children}</SchoolShell>;
}
