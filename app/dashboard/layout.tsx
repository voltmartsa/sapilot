import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Fdashboard");
  return <DashboardShell>{children}</DashboardShell>;
}
