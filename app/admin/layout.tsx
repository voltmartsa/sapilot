import { redirect } from "next/navigation";
import { getSessionUser, roleHomePath } from "@/lib/auth";
import AdminShell from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata = { title: "Admin Portal" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fadmin");
  if (user.role !== "super_admin") redirect(roleHomePath(user.role));
  return <AdminShell>{children}</AdminShell>;
}
