import Link from "next/link";
import { Roundel } from "./SiteHeader";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-navy-800 bg-navy-950 text-navy-100/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 text-white">
            <span className="text-gold-400">
              <Roundel className="h-7 w-7" />
            </span>
            <span className="font-display text-lg font-semibold">SA Pilot Question Bank</span>
          </div>
          <p className="mt-4 max-w-md text-sm leading-relaxed">
            Structured examination preparation for South African pilot licensing.
            Chapter-by-chapter practice and full timed mock examinations, with a
            written explanation for every question in the bank.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">
            Question Banks
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li><Link className="hover:text-white" href="/qualifications/ppl">Private Pilot Licence</Link></li>
            <li><Link className="hover:text-white" href="/qualifications/cpl">Commercial Pilot Licence</Link></li>
            <li><Link className="hover:text-white" href="/qualifications/instrument-rating">Instrument Rating</Link></li>
            <li><Link className="hover:text-white" href="/qualifications/atpl">Airline Transport Pilot Licence</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-400">
            Contact
          </h3>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a className="hover:text-white" href="mailto:voltmartsa@gmail.com">
                voltmartsa@gmail.com
              </a>
            </li>
            <li>
              <Link className="hover:text-white" href="/admin">
                Instructor portal
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-navy-800/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-xs text-navy-100/50 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} SA Pilot Question Bank. All rights reserved.</p>
          <p>
            An independent study aid. Not affiliated with or endorsed by the South African
            Civil Aviation Authority.
          </p>
        </div>
      </div>
    </footer>
  );
}
