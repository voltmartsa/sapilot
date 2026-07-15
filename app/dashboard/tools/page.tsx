"use client";

import { useEffect, useState } from "react";
import { useDashboard } from "@/components/dashboard/DashboardShell";
import MetarTafPanel from "@/components/dashboard/MetarTafPanel";

type ResourceRow = {
  id: number;
  kind: "document" | "link";
  title: string;
  description: string;
  url: string | null;
  fileId: number | null;
  filename: string | null;
  mime: string | null;
  size: number | null;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isVideoUrl(url: string) {
  return /youtube\.com|youtu\.be|vimeo\.com/i.test(url);
}

function DocumentIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2.5h6l3 3v12H6z" strokeLinejoin="round" />
      <path d="M12 2.5V6h3" strokeLinejoin="round" />
    </svg>
  );
}
function VideoIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
      <path d="M8.5 8l4 2-4 2z" fill="currentColor" stroke="none" />
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8.5 11.5a3 3 0 004.2 0l2-2a3 3 0 00-4.2-4.2l-1 1" strokeLinecap="round" />
      <path d="M11.5 8.5a3 3 0 00-4.2 0l-2 2a3 3 0 004.2 4.2l1-1" strokeLinecap="round" />
    </svg>
  );
}

export default function DashboardToolsPage() {
  const { activeSubjectId, activeSubject, loaded } = useDashboard();
  const [baseAirport, setBaseAirport] = useState<string | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [resources, setResources] = useState<ResourceRow[] | null>(null);

  useEffect(() => {
    fetch("/api/auth/profile")
      .then((r) => r.json())
      .then((d) => setBaseAirport(d.profile?.baseAirport ?? null))
      .catch(() => {})
      .finally(() => setProfileLoaded(true));
  }, []);

  useEffect(() => {
    if (!activeSubjectId) return;
    let cancelled = false;
    setResources(null);
    fetch(`/api/student/resources?subjectId=${activeSubjectId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setResources((d.resources ?? []) as ResourceRow[]);
      })
      .catch(() => {
        if (!cancelled) setResources([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeSubjectId]);

  const documents = (resources ?? []).filter((r) => r.kind === "document");
  const links = (resources ?? []).filter((r) => r.kind === "link");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy-900">Tools</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Live weather at your base airport, plus documents and videos for{" "}
        {activeSubject?.name ?? "your active subject"}.
      </p>

      <div className="mt-6">
        {profileLoaded && <MetarTafPanel baseAirport={baseAirport} />}
      </div>

      {loaded && !activeSubjectId ? (
        <p className="mt-8 text-sm text-ink-soft">
          Subscribe to a qualification in Settings to see its study materials.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Documents */}
          <div className="rounded-lg border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-semibold text-navy-900">
                Documents
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">{activeSubject?.name}</p>
            </div>
            {resources === null ? (
              <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
            ) : documents.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-soft">
                No documents have been added for this subject yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {documents.map((d) => (
                  <li key={d.id}>
                    <a
                      href={`/api/files/${d.fileId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-navy-50"
                    >
                      <span className="mt-0.5 shrink-0 text-navy-700">
                        <DocumentIcon />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {d.title}
                        </span>
                        {d.description && (
                          <span className="mt-0.5 block text-xs text-ink-soft">
                            {d.description}
                          </span>
                        )}
                        <span className="mt-0.5 block text-xs text-ink-soft">
                          {d.filename}
                          {d.size ? ` · ${formatBytes(d.size)}` : ""}
                        </span>
                      </span>
                      <span className="shrink-0 self-center text-xs font-semibold text-navy-800">
                        Open →
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Videos & links */}
          <div className="rounded-lg border border-line bg-white shadow-sm">
            <div className="border-b border-line px-5 py-4">
              <h2 className="font-display text-base font-semibold text-navy-900">
                Videos &amp; links
              </h2>
              <p className="mt-0.5 text-xs text-ink-soft">{activeSubject?.name}</p>
            </div>
            {resources === null ? (
              <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
            ) : links.length === 0 ? (
              <p className="px-5 py-6 text-sm text-ink-soft">
                No videos or links have been added for this subject yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {links.map((l) => {
                  const video = l.url ? isVideoUrl(l.url) : false;
                  return (
                    <li key={l.id}>
                      <a
                        href={l.url ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 px-5 py-3.5 transition-colors hover:bg-navy-50"
                      >
                        <span className="mt-0.5 shrink-0 text-navy-700">
                          {video ? <VideoIcon /> : <LinkIcon />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-ink">
                              {l.title}
                            </span>
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                                video ? "bg-red-100 text-red-700" : "bg-navy-100 text-navy-800"
                              }`}
                            >
                              {video ? "Video" : "Link"}
                            </span>
                          </span>
                          {l.description && (
                            <span className="mt-0.5 block text-xs text-ink-soft">
                              {l.description}
                            </span>
                          )}
                          <span className="mt-0.5 block truncate text-xs text-ink-soft">
                            {l.url}
                          </span>
                        </span>
                        <span className="shrink-0 self-center text-xs font-semibold text-navy-800">
                          Open →
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
