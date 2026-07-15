# SA Pilot Question Bank

A Next.js question bank and mock-examination platform for South African pilot
licensing exams: **PPL, CPL, Instrument Rating and ATPL**, each organised into its
core theoretical-knowledge subjects and chapters.

## Roles

Four tiers: **Super Admin** → **School** → **Instructor** → **Student**. Schools and
instructors are provisioned, not self-registered:

The super admin signs in like everyone else, at `/login`, with a **username**
(not an email) and password — seeded via `npm run db:seed-admin` (defaults to
username `Admin`, password `password123`; change the password immediately from
`/admin/settings`, or reseed with `npm run db:seed-admin <username> <password>`).
The legacy `ADMIN_PASSCODE` header (`x-admin-passcode`) still works on every
`/api/admin/*` route for scripts/automation, but the `/admin` portal itself is now
gated by a real session like the other three portals — no passcode box.

1. Super admin creates a school and its first School Admin account, from
   `/admin/schools`.
2. The School Admin signs in at `/login` and lands on `/school`, where they create
   Instructor accounts (`/school/instructors`) and assign students to instructors
   (`/school/students`).
3. Instructors sign in and land on `/instructor` — their assigned students, with a
   downloadable performance report per student (print-to-PDF + CSV export), including
   rule-based "where to focus and how to help" guidance built from weak-chapter and
   pass-rate analysis.
4. Students self-register as before. At signup they choose **independent** or
   **affiliated with a school** (school picker appears once at least one school
   exists); if affiliated, a separate opt-in checkbox controls whether their study
   *progress data* (not their name/email, which the school needs for administration)
   is visible to that school and their assigned instructor. Nothing is shared until
   a student explicitly opts in — verified end-to-end, including that a
   non-consenting student's report is blocked with a clear message.

Every account can change its own password from its Settings page
(`/dashboard/settings`, `/instructor/settings`, `/school/settings`).

## Flight booking (school-affiliated students only)

- **Aircraft** (`/school/aircraft`) — the school adds, edits and removes aircraft,
  each with a status of **available**, **at maintenance**, or **offline**. Only
  `available` aircraft can be requested for a booking.
- **Booking calendar** (`/school/bookings`, `/instructor/bookings`) — a shared
  day/week calendar (`components/BookingCalendar.tsx`) with aircraft as rows,
  confirmed flights in green, pending requests in gold, and the instructor's own
  bookings ringed for visibility. No month view, per spec.
- **Request → accept/decline** — an instructor requests a specific aircraft, date/time
  and one of their assigned students. The school admin accepts or declines (decline
  requires a reason). Accepting one request auto-declines any other still-pending
  request that would now double-book the same aircraft; accepting also re-checks for
  conflicts against already-confirmed flights as a safety net.
- **Cancellation** — once confirmed, only the instructor can cancel, and only with
  one of the four fixed reasons (weather / maintenance issues / student cancellation
  / aircraft not available) plus a required note. A separate no-reason "withdraw"
  exists for requests still pending.
- **Student Flights tab** (`/dashboard/flights`) — only shown in the sidebar for
  students affiliated with a school. Shows upcoming confirmed flights, pending
  requests awaiting approval, a self-service hour-logging form for past confirmed
  flights, a running flight-hour total, and recently cancelled flights with the
  instructor's stated reason.

All of the above was built and verified end-to-end with real test accounts
(school → instructor → student), including the maintenance-aircraft booking block,
the overlap/auto-decline mechanics, the 4-reason cancellation flow, the aircraft
delete guard, and the Flights tab being genuinely absent for independent students —
then all test data was removed.

## Features

- **Student accounts** — sign up / sign in with email and password (scrypt-hashed,
  30-day session cookies) plus a base airport in the SA ICAO "FA" format (FALA,
  FACT…). Students subscribe per qualification; only subscribed tracks are unlocked
  for practice and mock exams (enforced on both the pages and the questions API).
- **Student dashboard** (`/dashboard`, the landing page after login) — sidebar
  navigation (Dashboard / Practice / Exams / Saved / Settings) with a prominent
  subject switcher that re-scopes everything. The overview shows accuracy,
  questions answered, sessions completed and best exam score, plus resumable
  paused sessions and recent results.
- **Practice sessions** — chapter selection plus a two-thumb range slider to pick
  exactly which question numbers to drill (e.g. Q5–12). One question at a time with
  previous/next buttons and a navigator panel that turns green/red per answer.
  Sessions are persisted server-side (`study_sessions`), so **Pause & save** returns
  you to the dashboard and Resume continues exactly where you left off.
- **Mock exams** — generated from the Exams tab, timed, pausable, auto-submitted at
  zero; the last four completed papers are shown as score cards.
- **Results page** — a donut chart of correct / incorrect / unanswered plus a
  solutions browser: one question at a time with your answer, the correct answer,
  the explanation, and a colored question navigator.
- **Social** (`/dashboard/social`) — an opt-in weekly/monthly leaderboard per
  qualification, ranked by correct answers. Nobody appears until they opt in
  (Settings or directly from the leaderboard); your own rank is always visible to
  you privately even before opting in. First name only — never email or full name.
- **Tools** (`/dashboard/tools`) — live METAR/TAF for the student's base airport
  (via aviationweather.gov, no API key required) with a colour-coded VFR/MVFR/IFR/LIFR
  flight-category badge, plus a per-subject library of uploaded documents and
  video/learning links managed by instructors.
- **Admin dashboard** (`/admin`, real username/password login) — sidebar portal
  with: statistics overview; per-subject exam settings (questions, minutes, pass
  mark); flagged question queue; a filterable question bank manager with inline
  editing, multi-select bulk delete and per-chapter delete; a Resources manager
  for uploading documents and adding video/learning links per subject; user
  management (the super admin account itself can't be deleted from this table);
  subject/chapter management; and its own password-change page.
- **Saved questions** — a Save button on every question (practice and exam review)
  keeps it on the student's `/saved` page for later scrutiny, shown with the correct
  answer and explanation.
- **Question reports** — students can report a suspect question with a reason. Reports
  land in a review queue on the instructor portal where each can be marked resolved,
  dismissed, or have the offending question deleted from the bank. Students see the
  status of their own reports on `/account`.
- **Practice mode** — pick any combination of chapters in a subject and drill
  questions with immediate feedback and a written explanation after every answer.
- **Mock examinations** — a random timed paper drawn from the whole subject, with a
  question navigator, flag-for-review, auto-submit when time expires, and a full
  paper review scored against the 75% pass mark.
- **Bulk question upload** (`/admin/upload`) — upload questions from an Excel
  workbook into any chapter of any subject. Invalid rows are skipped and reported
  with their Excel row numbers. Chapters can also be deleted here.
- **Manual question creation** — the portal's "Create a question" tab adds a single
  question with an optional photo (PNG/JPEG/GIF/WebP, max 4 MB) — e.g. a chart,
  instrument face or diagram. Photos are stored in Postgres and served from
  `/api/images/[id]`; students click any question photo to enlarge it in a lightbox.
- **Excel template** — downloadable from the portal (`/api/admin/template`).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Drizzle ORM · Neon Postgres · SheetJS (xlsx)

## Setup

1. Copy `.env.example` to `.env` and set:
   - `DATABASE_URL` — Neon Postgres connection string
   - `ADMIN_PASSCODE` — legacy header-based passcode for `/api/admin/*` scripts
     (optional; the `/admin` portal itself uses real login, see below)
2. Install and initialise:

```bash
npm install
npm run db:push        # create tables
npm run db:seed        # seed the 4 qualifications and 30 subjects (idempotent)
npm run db:seed-admin  # create the super admin login (username Admin / password123 by default)
npm run dev             # http://localhost:3000
```

`db:seed-admin` accepts overrides: `npm run db:seed-admin -- <username> <password> <name>`.
Change the seeded password from `/admin/settings` after your first login.

## Excel upload format

The first sheet of the workbook must have a header row. Column names are matched
flexibly (case and punctuation are ignored):

| Column         | Required | Notes                                                        |
| -------------- | -------- | ------------------------------------------------------------ |
| Question       | yes      |                                                              |
| Option A       | yes      |                                                              |
| Option B       | yes      |                                                              |
| Option C       | no       | Leave blank for 2–3 option questions                         |
| Option D       | no       |                                                              |
| Correct Answer | yes      | A letter (A–D), a number (1–4), or the exact option text     |
| Explanation    | no       | Shown to students after answering and in the exam review     |

Each upload targets one chapter of one subject — either an existing chapter or a
new one named during the upload. `.xlsx`, `.xls` and `.csv` are accepted (max 10 MB).

## Database

Schema (`lib/db/schema.ts`): `qualifications → subjects → chapters → questions`,
with cascading deletes. Subjects carry per-exam defaults (paper length, minutes,
pass mark) used to size mock examinations.
