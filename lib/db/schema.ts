import {
  type AnyPgColumn,
  boolean,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const qualifications = pgTable("qualifications", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  shortName: varchar("short_name", { length: 16 }).notNull(),
  description: text("description").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const subjects = pgTable(
  "subjects",
  {
    id: serial("id").primaryKey(),
    qualificationId: integer("qualification_id")
      .notNull()
      .references(() => qualifications.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    examQuestions: integer("exam_questions").notNull().default(40),
    examMinutes: integer("exam_minutes").notNull().default(60),
    passMark: integer("pass_mark").notNull().default(75),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("subjects_qualification_slug_idx").on(t.qualificationId, t.slug)],
);

export const chapters = pgTable(
  "chapters",
  {
    id: serial("id").primaryKey(),
    subjectId: integer("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [uniqueIndex("chapters_subject_name_idx").on(t.subjectId, t.name)],
);

export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  mime: varchar("mime", { length: 64 }).notNull(),
  data: text("data").notNull(), // base64-encoded image bytes
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  chapterId: integer("chapter_id")
    .notNull()
    .references(() => chapters.id, { onDelete: "cascade" }),
  imageId: integer("image_id").references(() => images.id, {
    onDelete: "set null",
  }),
  text: text("text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c"),
  optionD: text("option_d"),
  correct: varchar("correct", { length: 1 }).notNull(), // "A" | "B" | "C" | "D"
  explanation: text("explanation").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const schools = pgTable("schools", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  username: varchar("username", { length: 32 }).unique(), // super_admin login handle
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  baseAirport: varchar("base_airport", { length: 4 }), // SA ICAO code, e.g. FALA
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  // Role hierarchy: super_admin (site owner) > school_admin > instructor > student.
  role: varchar("role", { length: 20 }).notNull().default("student"), // student | instructor | school_admin | super_admin
  // For instructors/school_admins: their employer school. For students: the school
  // they affiliated with at signup (null = independent student).
  schoolId: integer("school_id").references(() => schools.id, { onDelete: "set null" }),
  // Students only: the instructor they've been assigned to by their school.
  instructorId: integer("instructor_id").references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
  // Students only: consent to share study progress/performance data with their
  // school and assigned instructor. Roster visibility (name/email) is inherent to
  // choosing a school; this flag gates report/performance data specifically.
  shareWithSchool: boolean("share_with_school").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const studySessions = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 10 }).notNull(), // practice | exam
  status: varchar("status", { length: 12 }).notNull().default("active"), // active | completed
  label: text("label").notNull().default(""),
  questionIds: jsonb("question_ids").$type<number[]>().notNull(),
  answers: jsonb("answers").$type<Record<string, string>>().notNull().default({}),
  currentIndex: integer("current_index").notNull().default(0),
  totalSeconds: integer("total_seconds"), // exam time limit; null for practice
  secondsUsed: integer("seconds_used").notNull().default(0),
  correctCount: integer("correct_count"),
  answeredCount: integer("answered_count"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const sessions = pgTable("sessions", {
  token: varchar("token", { length: 64 }).primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qualificationId: integer("qualification_id")
      .notNull()
      .references(() => qualifications.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscriptions_user_qualification_idx").on(t.userId, t.qualificationId)],
);

export const savedQuestions = pgTable(
  "saved_questions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("saved_questions_user_question_idx").on(t.userId, t.questionId)],
);

export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  mime: varchar("mime", { length: 100 }).notNull(),
  data: text("data").notNull(), // base64-encoded file bytes
  size: integer("size").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id")
    .notNull()
    .references(() => subjects.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 10 }).notNull(), // "document" | "link"
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  url: text("url"), // for kind = "link"
  fileId: integer("file_id").references(() => files.id, { onDelete: "cascade" }), // for kind = "document"
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  status: varchar("status", { length: 16 }).notNull().default("open"), // open | resolved | dismissed
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aircraft = pgTable(
  "aircraft",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => schools.id, { onDelete: "cascade" }),
    registration: varchar("registration", { length: 16 }).notNull(),
    type: text("type").notNull(), // e.g. "Cessna 172"
    status: varchar("status", { length: 12 }).notNull().default("available"), // available | maintenance | offline
    note: text("note").notNull().default(""),
    // Airworthiness tracking — calendar-date due items. Nullable: a school may
    // not have entered them yet.
    arcExpiry: timestamp("arc_expiry"),
    insuranceExpiry: timestamp("insurance_expiry"),
    nextInspectionDue: timestamp("next_inspection_due"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("aircraft_school_registration_idx").on(t.schoolId, t.registration)],
);

export const flightBookings = pgTable("flight_bookings", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  aircraftId: integer("aircraft_id")
    .notNull()
    .references(() => aircraft.id, { onDelete: "cascade" }),
  instructorId: integer("instructor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  studentId: integer("student_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  purpose: text("purpose").notNull().default(""),
  // pending | confirmed | declined | withdrawn | cancelled
  status: varchar("status", { length: 12 }).notNull().default("pending"),
  declineReason: text("decline_reason"),
  // weather | maintenance | student_cancellation | aircraft_unavailable
  cancelReasonCategory: varchar("cancel_reason_category", { length: 24 }),
  cancelNote: text("cancel_note"),
  cancelledBy: integer("cancelled_by").references((): AnyPgColumn => users.id, {
    onDelete: "set null",
  }),
  cancelledAt: timestamp("cancelled_at"),
  hoursLogged: real("hours_logged"),
  hoursLoggedAt: timestamp("hours_logged_at"),
  // dual | solo | pic — set alongside hoursLogged when a student logs hours.
  hoursRole: varchar("hours_role", { length: 8 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Generic, manually-entered currency/recency due-dates (e.g. medical, BFR,
// licence revalidation). Deliberately not modelling specific SACAA regulatory
// rules — the student enters what applies to them.
export const currencyItems = pgTable("currency_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  dueDate: timestamp("due_date").notNull(),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Manually entered historical flight hours (e.g. flown before joining, with
// another school, or self-flown) — not tied to a school aircraft booking.
export const manualLogbookEntries = pgTable("manual_logbook_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  flightDate: timestamp("flight_date").notNull(),
  aircraftType: text("aircraft_type").notNull(),
  registration: varchar("registration", { length: 16 }).notNull().default(""),
  picName: text("pic_name").notNull().default(""),
  route: text("route").notNull().default(""), // flight sequence, e.g. FALA-FAGC-FALA
  dayNight: varchar("day_night", { length: 5 }).notNull().default("day"), // "day" | "night"
  landings: integer("landings").notNull().default(1),
  instrumentHours: real("instrument_hours"), // nullable — only if any instrument time was flown
  hours: real("hours").notNull(),
  role: varchar("role", { length: 8 }).notNull().default("dual"), // dual | solo | pic
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const groundSchoolSessions = pgTable("ground_school_sessions", {
  id: serial("id").primaryKey(),
  schoolId: integer("school_id")
    .notNull()
    .references(() => schools.id, { onDelete: "cascade" }),
  instructorId: integer("instructor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  startsAt: timestamp("starts_at").notNull(),
  endsAt: timestamp("ends_at").notNull(),
  location: text("location").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type Qualification = typeof qualifications.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type User = typeof users.$inferSelect;
export type School = typeof schools.$inferSelect;
export type Aircraft = typeof aircraft.$inferSelect;
export type FlightBooking = typeof flightBookings.$inferSelect;
export type CurrencyItem = typeof currencyItems.$inferSelect;
export type GroundSchoolSession = typeof groundSchoolSessions.$inferSelect;
export type ManualLogbookEntry = typeof manualLogbookEntries.$inferSelect;
