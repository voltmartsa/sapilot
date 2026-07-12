import Link from "next/link";
import AccountMenu from "./AccountMenu";

const nav = [
  { href: "/qualifications/ppl", label: "PPL" },
  { href: "/qualifications/cpl", label: "CPL" },
  { href: "/qualifications/instrument-rating", label: "Instrument Rating" },
  { href: "/qualifications/atpl", label: "ATPL" },
];

export function Roundel({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      <path
        d="M20 6 L22.4 17.6 L34 20 L22.4 22.4 L20 34 L17.6 22.4 L6 20 L17.6 17.6 Z"
        fill="currentColor"
      />
      <circle cx="20" cy="20" r="2.2" fill="var(--color-gold-500)" />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-navy-800 bg-navy-900 text-white shadow-sm">
      <div className="h-0.5 bg-gold-500" />
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-gold-400">
            <Roundel />
          </span>
          <span className="leading-tight">
            <span className="font-display block text-lg font-semibold tracking-wide">
              SA Pilot Question Bank
            </span>
            <span className="block text-[11px] uppercase tracking-[0.18em] text-navy-100/70">
              Aviation Examination Preparation
            </span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-3 py-2 text-sm font-medium text-navy-100/90 transition-colors hover:bg-navy-800 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="mx-2 rounded border border-gold-500/60 px-3 py-1.5 text-sm font-medium text-gold-400 transition-colors hover:bg-gold-500 hover:text-navy-950"
          >
            Instructor
          </Link>
          <AccountMenu />
        </nav>
        <span className="md:hidden">
          <AccountMenu />
        </span>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-navy-800 px-4 py-1.5 md:hidden">
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded px-3 py-1.5 text-sm text-navy-100/90 hover:bg-navy-800"
          >
            {item.label}
          </Link>
        ))}
        <Link
          href="/admin"
          className="whitespace-nowrap rounded px-3 py-1.5 text-sm text-gold-400 hover:bg-navy-800"
        >
          Instructor
        </Link>
      </nav>
    </header>
  );
}
