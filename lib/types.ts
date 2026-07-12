export type QuizQuestion = {
  id: number;
  imageId: number | null;
  text: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correct: string; // "A" | "B" | "C" | "D"
  explanation: string;
  chapterName: string;
};

export const OPTION_KEYS = ["A", "B", "C", "D"] as const;
export type OptionKey = (typeof OPTION_KEYS)[number];

export function optionsOf(q: QuizQuestion): { key: OptionKey; text: string }[] {
  const all: { key: OptionKey; text: string | null }[] = [
    { key: "A", text: q.optionA },
    { key: "B", text: q.optionB },
    { key: "C", text: q.optionC },
    { key: "D", text: q.optionD },
  ];
  return all.filter((o): o is { key: OptionKey; text: string } => !!o.text?.trim());
}
