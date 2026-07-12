import { NextRequest } from "next/server";

export function checkAdminPasscode(req: NextRequest): boolean {
  const passcode = req.headers.get("x-admin-passcode") ?? "";
  return !!process.env.ADMIN_PASSCODE && passcode === process.env.ADMIN_PASSCODE;
}
