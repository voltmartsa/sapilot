import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { aircraft, schools, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/auth";

const MAINTENANCE_WINDOW_DAYS = 30;

type MaintenanceAlert = { id: number; registration: string; item: string; dueDate: string; overdue: boolean };

function collectAlerts(rows: (typeof aircraft.$inferSelect)[]): MaintenanceAlert[] {
  const now = Date.now();
  const windowMs = MAINTENANCE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const items: { key: keyof typeof aircraft.$inferSelect; label: string }[] = [
    { key: "arcExpiry", label: "ARC expiry" },
    { key: "insuranceExpiry", label: "Insurance expiry" },
    { key: "nextInspectionDue", label: "Inspection due" },
  ];
  const alerts: MaintenanceAlert[] = [];
  for (const ac of rows) {
    for (const { key, label } of items) {
      const value = ac[key];
      if (!(value instanceof Date)) continue;
      const diff = value.getTime() - now;
      if (diff <= windowMs) {
        alerts.push({ id: ac.id, registration: ac.registration, item: label, dueDate: value.toISOString(), overdue: diff < 0 });
      }
    }
  }
  return alerts.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user || user.role !== "school_admin" || !user.schoolId) {
    return NextResponse.json({ error: "Not authorised." }, { status: 403 });
  }

  const [school] = await db.select().from(schools).where(eq(schools.id, user.schoolId));
  const [instructorAgg] = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "instructor")));
  const [studentAgg] = await db
    .select({
      total: sql<number>`count(*)`.mapWith(Number),
      sharing: sql<number>`count(*) filter (where ${users.shareWithSchool})`.mapWith(Number),
      assigned: sql<number>`count(*) filter (where ${users.instructorId} is not null)`.mapWith(Number),
    })
    .from(users)
    .where(and(eq(users.schoolId, user.schoolId), eq(users.role, "student")));

  const fleet = await db.select().from(aircraft).where(eq(aircraft.schoolId, user.schoolId));
  const maintenanceAlerts = collectAlerts(fleet);

  return NextResponse.json({
    school,
    instructorCount: instructorAgg.count,
    studentCount: studentAgg.total,
    sharingCount: studentAgg.sharing,
    assignedCount: studentAgg.assigned,
    maintenanceAlerts,
  });
}
