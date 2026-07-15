import { and, eq, lt, gt, ne, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { flightBookings } from "@/lib/db/schema";

/** True if any CONFIRMED booking for this aircraft overlaps the given window. */
export async function hasConfirmedOverlap(
  aircraftId: number,
  startsAt: Date,
  endsAt: Date,
  excludeBookingId?: number,
): Promise<boolean> {
  const conditions = [
    eq(flightBookings.aircraftId, aircraftId),
    eq(flightBookings.status, "confirmed"),
    lt(flightBookings.startsAt, endsAt),
    gt(flightBookings.endsAt, startsAt),
  ];
  if (excludeBookingId) conditions.push(ne(flightBookings.id, excludeBookingId) as SQL);
  const rows = await db
    .select({ id: flightBookings.id })
    .from(flightBookings)
    .where(and(...conditions));
  return rows.length > 0;
}

export const CANCEL_REASONS = new Set([
  "weather",
  "maintenance",
  "student_cancellation",
  "aircraft_unavailable",
]);

export const CANCEL_REASON_LABEL: Record<string, string> = {
  weather: "Weather",
  maintenance: "Maintenance issues",
  student_cancellation: "Student cancellation",
  aircraft_unavailable: "Aircraft not available",
};
