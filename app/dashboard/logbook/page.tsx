"use client";

import LogbookView from "@/components/LogbookView";

export default function LogbookPage() {
  return <LogbookView fetchUrl="/api/student/logbook" backHref="/dashboard/flights" backLabel="Back to flights" />;
}
