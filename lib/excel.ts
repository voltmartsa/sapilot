import * as XLSX from "xlsx";

export type ParsedQuestion = {
  text: string;
  optionA: string;
  optionB: string;
  optionC: string | null;
  optionD: string | null;
  correct: "A" | "B" | "C" | "D";
  explanation: string;
};

export type RowError = { row: number; message: string };

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  question: "question",
  questiontext: "question",
  q: "question",
  a: "optionA",
  optiona: "optionA",
  answera: "optionA",
  b: "optionB",
  optionb: "optionB",
  answerb: "optionB",
  c: "optionC",
  optionc: "optionC",
  answerc: "optionC",
  d: "optionD",
  optiond: "optionD",
  answerd: "optionD",
  correct: "correct",
  answer: "correct",
  correctanswer: "correct",
  correctoption: "correct",
  ans: "correct",
  key: "correct",
  explanation: "explanation",
  explain: "explanation",
  rationale: "explanation",
  reason: "explanation",
  notes: "explanation",
};

type RawRow = {
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correct: string;
  explanation: string;
};

function normalizeHeader(h: string): keyof RawRow | null {
  const key = h.toLowerCase().replace(/[^a-z0-9]/g, "");
  return HEADER_ALIASES[key] ?? null;
}

function asText(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export function parseQuestionWorkbook(buffer: ArrayBuffer): {
  questions: ParsedQuestion[];
  errors: RowError[];
  totalRows: number;
} {
  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { questions: [], errors: [{ row: 0, message: "The workbook contains no sheets." }], totalRows: 0 };
  }
  const sheet = workbook.Sheets[sheetName];
  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  });
  if (grid.length < 2) {
    return {
      questions: [],
      errors: [{ row: 0, message: "The sheet needs a header row plus at least one question row." }],
      totalRows: 0,
    };
  }

  const headerRow = grid[0].map((h) => normalizeHeader(asText(h)));
  const columnIndex: Partial<Record<keyof RawRow, number>> = {};
  headerRow.forEach((field, i) => {
    if (field && columnIndex[field] === undefined) columnIndex[field] = i;
  });

  const missing: string[] = [];
  if (columnIndex.question === undefined) missing.push("Question");
  if (columnIndex.optionA === undefined) missing.push("Option A");
  if (columnIndex.optionB === undefined) missing.push("Option B");
  if (columnIndex.correct === undefined) missing.push("Correct Answer");
  if (missing.length > 0) {
    return {
      questions: [],
      errors: [
        {
          row: 1,
          message: `Missing required column${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}. Download the template for the expected layout.`,
        },
      ],
      totalRows: grid.length - 1,
    };
  }

  const questions: ParsedQuestion[] = [];
  const errors: RowError[] = [];

  for (let r = 1; r < grid.length; r++) {
    const rowNumber = r + 1; // 1-based, matching what the user sees in Excel
    const cells = grid[r];
    const get = (field: keyof RawRow) => {
      const idx = columnIndex[field];
      return idx === undefined ? "" : asText(cells[idx]);
    };

    const text = get("question");
    const optionA = get("optionA");
    const optionB = get("optionB");
    const optionC = get("optionC");
    const optionD = get("optionD");
    const correctRaw = get("correct");
    const explanation = get("explanation");

    if (!text && !optionA && !optionB && !correctRaw) continue; // fully blank row

    if (!text) {
      errors.push({ row: rowNumber, message: "Question text is empty." });
      continue;
    }
    if (!optionA || !optionB) {
      errors.push({ row: rowNumber, message: "Options A and B are both required." });
      continue;
    }

    const options: Record<string, string> = { A: optionA, B: optionB };
    if (optionC) options.C = optionC;
    if (optionD) options.D = optionD;

    let correct: string | null = null;
    const c = correctRaw.trim();
    if (/^[a-dA-D]$/.test(c)) {
      correct = c.toUpperCase();
    } else if (/^[1-4]$/.test(c)) {
      correct = "ABCD"[Number(c) - 1];
    } else if (c) {
      const match = Object.entries(options).find(
        ([, v]) => v.toLowerCase() === c.toLowerCase(),
      );
      if (match) correct = match[0];
    }

    if (!correct) {
      errors.push({
        row: rowNumber,
        message: `Correct answer "${correctRaw}" is not a letter A–D and does not match any option.`,
      });
      continue;
    }
    if (!options[correct]) {
      errors.push({
        row: rowNumber,
        message: `Correct answer is "${correct}" but option ${correct} is empty.`,
      });
      continue;
    }

    questions.push({
      text,
      optionA,
      optionB,
      optionC: optionC || null,
      optionD: optionD || null,
      correct: correct as ParsedQuestion["correct"],
      explanation,
    });
  }

  return { questions, errors, totalRows: grid.length - 1 };
}

export function buildTemplateWorkbook(): Buffer {
  const rows = [
    ["Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Explanation"],
    [
      "What is the standard sea-level pressure in the International Standard Atmosphere?",
      "1013.25 hPa",
      "1000.00 hPa",
      "1025.13 hPa",
      "980.00 hPa",
      "A",
      "The ISA defines mean sea-level pressure as 1013.25 hPa (29.92 inHg) with a temperature of +15°C.",
    ],
    [
      "An aircraft flying at a constant indicated airspeed climbs to a higher altitude. What happens to its true airspeed?",
      "It decreases",
      "It remains the same",
      "It increases",
      "It fluctuates unpredictably",
      "C",
      "As air density decreases with altitude, a constant IAS corresponds to a progressively higher TAS.",
    ],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [
    { wch: 70 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 14 }, { wch: 80 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "Questions");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
