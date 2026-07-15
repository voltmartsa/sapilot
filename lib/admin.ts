import { NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";

/** True if the value matches the legacy shared ADMIN_PASSCODE (kept for scripts/back-compat). */
export function passcodeIsValid(candidate: string | null | undefined): boolean {
  return !!process.env.ADMIN_PASSCODE && candidate === process.env.ADMIN_PASSCODE;
}

/** True if the current request is signed in as the super_admin account. */
export async function isSuperAdmin(): Promise<boolean> {
  const user = await getSessionUser();
  return user?.role === "super_admin";
}

/** Header-based check: legacy passcode header, or a real super_admin session. */
export async function checkAdminAuth(req: NextRequest): Promise<boolean> {
  if (passcodeIsValid(req.headers.get("x-admin-passcode"))) return true;
  return isSuperAdmin();
}
