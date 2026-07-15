import { redirect } from "next/navigation";
import { getSessionUser, roleHomePath } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  if (user.role !== "student") redirect(roleHomePath(user.role));
  return <DashboardShell>{children}</DashboardShell>;
}
