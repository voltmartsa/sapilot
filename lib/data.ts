import { count, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chapters,
  qualifications,
  questions,
  reports,
  savedQuestions,
  subjects,
} from "@/lib/db/schema";

export async function getQualifications() {
  return db
    .select()
    .from(qualifications)
    .orderBy(qualifications.sortOrder);
}

export async function getSiteStats() {
  const [row] = await db
    .select({
      questionCount: count(questions.id),
    })
    .from(questions);
  const [subjectRow] = await db
    .select({ subjectCount: count(subjects.id) })
    .from(subjects);
  return {
    questionCount: row?.questionCount ?? 0,
    subjectCount: subjectRow?.subjectCount ?? 0,
  };
}

export async function getQualificationWithSubjects(slug: string) {
  const [qualification] = await db
    .select()
    .from(qualifications)
    .where(eq(qualifications.slug, slug));
  if (!qualification) return null;

  const subjectRows = await db
    .select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      description: subjects.description,
      examQuestions: subjects.examQuestions,
      examMinutes: subjects.examMinutes,
      passMark: subjects.passMark,
      sortOrder: subjects.sortOrder,
      chapterCount: sql<number>`count(distinct ${chapters.id})`.mapWith(Number),
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(subjects)
    .leftJoin(chapters, eq(chapters.subjectId, subjects.id))
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .where(eq(subjects.qualificationId, qualification.id))
    .groupBy(subjects.id)
    .orderBy(subjects.sortOrder);

  return { qualification, subjects: subjectRows };
}

export async function getSubjectDetail(subjectId: number) {
  const [subject] = await db
    .select()
    .from(subjects)
    .where(eq(subjects.id, subjectId));
  if (!subject) return null;

  const [qualification] = await db
    .select()
    .from(qualifications)
    .where(eq(qualifications.id, subject.qualificationId));

  const chapterRows = await db
    .select({
      id: chapters.id,
      name: chapters.name,
      sortOrder: chapters.sortOrder,
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(chapters)
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .where(eq(chapters.subjectId, subjectId))
    .groupBy(chapters.id)
    .orderBy(chapters.sortOrder, chapters.name);

  return { subject, qualification, chapters: chapterRows };
}

export async function getSavedQuestionsForUser(userId: number) {
  return db
    .select({
      savedAt: savedQuestions.createdAt,
      id: questions.id,
      imageId: questions.imageId,
      text: questions.text,
      optionA: questions.optionA,
      optionB: questions.optionB,
      optionC: questions.optionC,
      optionD: questions.optionD,
      correct: questions.correct,
      explanation: questions.explanation,
      chapterName: chapters.name,
      subjectName: subjects.name,
      subjectId: subjects.id,
      qualificationShortName: qualifications.shortName,
    })
    .from(savedQuestions)
    .innerJoin(questions, eq(questions.id, savedQuestions.questionId))
    .innerJoin(chapters, eq(chapters.id, questions.chapterId))
    .innerJoin(subjects, eq(subjects.id, chapters.subjectId))
    .innerJoin(qualifications, eq(qualifications.id, subjects.qualificationId))
    .where(eq(savedQuestions.userId, userId))
    .orderBy(desc(savedQuestions.createdAt));
}

export async function getReportsForUser(userId: number) {
  return db
    .select({
      id: reports.id,
      reason: reports.reason,
      status: reports.status,
      createdAt: reports.createdAt,
      questionText: questions.text,
    })
    .from(reports)
    .innerJoin(questions, eq(questions.id, reports.questionId))
    .where(eq(reports.userId, userId))
    .orderBy(desc(reports.createdAt));
}

export async function getAdminTree() {
  const quals = await getQualifications();
  const subjectRows = await db
    .select({
      id: subjects.id,
      name: subjects.name,
      qualificationId: subjects.qualificationId,
      sortOrder: subjects.sortOrder,
    })
    .from(subjects)
    .orderBy(subjects.sortOrder);
  const chapterRows = await db
    .select({
      id: chapters.id,
      name: chapters.name,
      subjectId: chapters.subjectId,
      questionCount: sql<number>`count(${questions.id})`.mapWith(Number),
    })
    .from(chapters)
    .leftJoin(questions, eq(questions.chapterId, chapters.id))
    .groupBy(chapters.id)
    .orderBy(chapters.sortOrder, chapters.name);

  return quals.map((q) => ({
    id: q.id,
    name: q.name,
    shortName: q.shortName,
    subjects: subjectRows
      .filter((s) => s.qualificationId === q.id)
      .map((s) => ({
        id: s.id,
        name: s.name,
        chapters: chapterRows
          .filter((c) => c.subjectId === s.id)
          .map((c) => ({ id: c.id, name: c.name, questionCount: c.questionCount })),
      })),
  }));
}
