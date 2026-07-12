# SA Pilot Question Bank

A Next.js question bank and mock-examination platform for South African pilot
licensing exams: **PPL, CPL, Instrument Rating and ATPL**, each organised into its
core theoretical-knowledge subjects and chapters.

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
- **Admin dashboard** (`/admin`, passcode-gated) — sidebar portal with: statistics
  overview; per-subject exam settings (questions, minutes, pass mark); flagged
  question queue; a filterable question bank manager with inline editing,
  multi-select bulk delete and per-chapter delete; user management; and
  subject/chapter management.
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
- **Instructor portal** (`/admin`) — upload questions from an Excel workbook into any
  chapter of any subject, protected by a passcode. Invalid rows are skipped and
  reported with their Excel row numbers. Chapters can also be deleted here.
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
   - `ADMIN_PASSCODE` — passcode for the instructor portal
2. Install and initialise:

```bash
npm install
npm run db:push   # create tables
npm run db:seed   # seed the 4 qualifications and 30 subjects (idempotent)
npm run dev       # http://localhost:3000
```

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
