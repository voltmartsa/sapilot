import {
  integer,
  jsonb,
  pgTable,
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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 254 }).notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  baseAirport: varchar("base_airport", { length: 4 }), // SA ICAO code, e.g. FALA
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

export type Qualification = typeof qualifications.$inferSelect;
export type Subject = typeof subjects.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type Question = typeof questions.$inferSelect;
export type User = typeof users.$inferSelect;
