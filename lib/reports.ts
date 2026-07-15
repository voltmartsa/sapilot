import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  chapters,
  qualifications,
  questions,
  studySessions,
  subjects,
  subscriptions,
  users,
} from "@/lib/db/schema";

const WEAK_THRESHOLD = 0.7;
const MIN_ATTEMPTS = 2;

export type StudentReport = NonNullable<Awaited<ReturnType<typeof buildStudentReport>>>;

/**
 * A full, all-time performance report for one student: subject-by-subject
 * stats, weakest chapters, recent session history, and rule-based guidance on
 * what to focus on next. Used by the instructor "download report" view.
 */
export async function buildStudentReport(studentId: number) {
  const [student] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      baseAirport: users.baseAirport,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, studentId));
  if (!student) return null;

  const subs = await db
    .select({ qualificationId: qualifications.id, qualificationName: qualifications.name })
    .from(subscriptions)
    .innerJoin(qualifications, eq(qualifications.id, subscriptions.qualificationId))
    .where(eq(subscriptions.userId, studentId));

  const sessionRows = await db
    .select({
      subjectId: studySessions.subjectId,
      subjectName: subjects.name,
      passMark: subjects.passMark,
      kind: studySessions.kind,
      correctCount: studySessions.correctCount,
      answeredCount: studySessions.answeredCount,
      questionIds: studySessions.questionIds,
      answers: studySessions.answers,
      completedAt: studySessions.completedAt,
      label: studySessions.label,
    })
    .from(studySessions)
    .innerJoin(subjects, eq(subjects.id, studySessions.subjectId))
    .where(and(eq(studySessions.userId, studentId), eq(studySessions.status, "completed")))
    .orderBy(desc(studySessions.completedAt));

  // Per-subject rollup.
  type SubjectAgg = {
    subjectId: number;
    subjectName: string;
    passMark: number;
    correct: number;
    answered: number;
    sessions: number;
    exams: number;
    bestExamPct: number;
  };
  const bySubject = new Map<number, SubjectAgg>();
  for (const r of sessionRows) {
    let agg = bySubject.get(r.subjectId);
    if (!agg) {
      agg = {
        subjectId: r.subjectId,
        subjectName: r.subjectName,
        passMark: r.passMark,
        correct: 0,
        answered: 0,
        sessions: 0,
        exams: 0,
        bestExamPct: 0,
      };
      bySubject.set(r.subjectId, agg);
    }
    agg.correct += r.correctCount ?? 0;
    agg.answered += r.answeredCount ?? 0;
    agg.sessions += 1;
    if (r.kind === "exam") {
      agg.exams += 1;
      const total = r.questionIds.length;
      const pct = total > 0 ? Math.round(((r.correctCount ?? 0) / total) * 100) : 0;
      if (pct > agg.bestExamPct) agg.bestExamPct = pct;
    }
  }
  const subjectStats = [...bySubject.values()]
    .map((s) => ({ ...s, accuracy: s.answered > 0 ? Math.round((s.correct / s.answered) * 100) : 0 }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  // Weak-chapter rollup, across every completed session, all-time.
  const allQuestionIds = [...new Set(sessionRows.flatMap((r) => r.questionIds))];
  const questionRows = allQuestionIds.length
    ? await db
        .select({
          id: questions.id,
          correct: questions.correct,
          chapterId: chapters.id,
          chapterName: chapters.name,
          subjectId: chapters.subjectId,
        })
        .from(questions)
        .innerJoin(chapters, eq(chapters.id, questions.chapterId))
        .where(inArray(questions.id, allQuestionIds))
    : [];
  const questionById = new Map(questionRows.map((q) => [q.id, q]));
  const subjectNameById = new Map(sessionRows.map((r) => [r.subjectId, r.subjectName]));

  type ChapterAgg = {
    chapterId: number;
    chapterName: string;
    subjectName: string;
    correct: number;
    wrong: number;
    unanswered: number;
  };
  const byChapter = new Map<number, ChapterAgg>();
  for (const r of sessionRows) {
    for (const qid of r.questionIds) {
      const q = questionById.get(qid);
      if (!q) continue;
      const given = r.answers?.[String(qid)];
      const outcome = given === undefined ? "unanswered" : given === q.correct ? "correct" : "wrong";
      let agg = byChapter.get(q.chapterId);
      if (!agg) {
        agg = {
          chapterId: q.chapterId,
          chapterName: q.chapterName,
          subjectName: subjectNameById.get(q.subjectId) ?? "",
          correct: 0,
          wrong: 0,
          unanswered: 0,
        };
        byChapter.set(q.chapterId, agg);
      }
      agg[outcome] += 1;
    }
  }
  const weakChapters = [...byChapter.values()]
    .map((c) => {
      const total = c.correct + c.wrong + c.unanswered;
      return { ...c, total, accuracy: total > 0 ? Math.round((c.correct / total) * 100) : 0 };
    })
    .filter((c) => c.total >= MIN_ATTEMPTS && c.accuracy / 100 < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 8);

  const recentSessions = sessionRows.slice(0, 20).map((r) => ({
    subjectName: r.subjectName,
    kind: r.kind,
    label: r.label,
    correct: r.correctCount ?? 0,
    total: r.questionIds.length,
    completedAt: r.completedAt,
  }));

  const totalAnswered = subjectStats.reduce((n, s) => n + s.answered, 0);
  const totalCorrect = subjectStats.reduce((n, s) => n + s.correct, 0);
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : null;
  const totalExams = subjectStats.reduce((n, s) => n + s.exams, 0);

  const insights: string[] = [];
  if (totalAnswered === 0) {
    insights.push(`${student.name} has not yet answered any questions — encourage a first practice session.`);
  } else {
    const critical = weakChapters.filter((c) => c.accuracy < 50);
    const moderate = weakChapters.filter((c) => c.accuracy >= 50);
    for (const c of critical.slice(0, 3)) {
      insights.push(
        `${c.chapterName} (${c.subjectName}) — ${c.accuracy}% correct over ${c.total} questions. Recommend focused revision of this chapter before further mock exams.`,
      );
    }
    for (const c of moderate.slice(0, 3)) {
      insights.push(
        `${c.chapterName} (${c.subjectName}) — ${c.accuracy}% correct. Extra practice would help consolidate this material.`,
      );
    }
    if (weakChapters.length === 0) {
      insights.push("No weak chapters identified — performance is holding up well across all attempted material.");
    }
    for (const s of subjectStats) {
      if (s.exams === 0) {
        insights.push(`Has not yet attempted a timed mock examination in ${s.subjectName} — a good next step once chapter practice feels solid.`);
      } else if (s.bestExamPct < s.passMark) {
        insights.push(`Has not yet reached the ${s.passMark}% pass mark in ${s.subjectName} mock exams (best attempt: ${s.bestExamPct}%).`);
      }
    }
    if (overallAccuracy !== null && overallAccuracy >= 85 && totalExams > 0) {
      insights.push("Strong overall performance — ready for full-length timed practice under exam conditions.");
    }
  }

  return {
    student,
    subscriptions: subs,
    subjectStats,
    weakChapters,
    recentSessions,
    overallAccuracy,
    totalAnswered,
    totalExams,
    insights,
  };
}
