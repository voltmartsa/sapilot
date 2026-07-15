"use client";

import LogbookView from "@/components/LogbookView";

export default function InstructorLogbookPage() {
  return <LogbookView fetchUrl="/api/instructor/logbook" backHref="/instructor" backLabel="Back to my students" />;
}
