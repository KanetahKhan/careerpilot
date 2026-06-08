/**
 * Pure-function core of the fit-score engine.
 * No I/O, no LLM calls, no Supabase — all deterministic TypeScript math.
 * Exported so unit tests can exercise each factor independently.
 */

export type FitBreakdown = {
  score: number;
  semantic: number;
  skills: number;
  seniority: number;
  education: number;
  location: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
};

/** Five programmatic factors. Tuned so semantic + skills still dominate. */
export const WEIGHTS = {
  semantic: 0.4,
  skills: 0.3,
  seniority: 0.1,
  education: 0.1,
  location: 0.1,
} as const;

export function cosine(a: number[], b: number[]): number {
  let dot = 0,
    na = 0,
    nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= vectors.length;
  return out;
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

export function parseDate(s: string): Date | null {
  const trimmed = s.trim();
  const slashM = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashM) {
    const m = parseInt(slashM[1], 10) - 1;
    return m >= 0 && m <= 11 ? new Date(parseInt(slashM[2], 10), m) : null;
  }
  const textM = trimmed.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (textM) {
    const m = MONTH_NAMES[textM[1].toLowerCase()];
    return m !== undefined ? new Date(parseInt(textM[2], 10), m) : null;
  }
  const yearM = trimmed.match(/^(\d{4})$/);
  if (yearM) return new Date(parseInt(yearM[1], 10), 0);
  return null;
}

export function monthsBetween(start: string, end: string, now: Date): number {
  const startD = parseDate(start);
  if (!startD) return 0;
  const endD = /^(present|current|now)$/i.test(end.trim()) ? now : parseDate(end) ?? now;
  return Math.max(0, (endD.getFullYear() - startD.getFullYear()) * 12 + endD.getMonth() - startD.getMonth());
}

/**
 * Infer years of experience from date ranges in text. Accepts an optional
 * `now` date so tests can be deterministic regardless of when they run.
 */
export function estimateExperienceYears(cvText: string, now = new Date()): number {
  const explicitM = cvText.match(/(\d+)\+?\s*(years|yrs)/i);
  const explicit = explicitM ? parseInt(explicitM[1], 10) : 0;

  const intervals: { start: number; end: number }[] = [];
  const allRanges: [string, string][] = [];

  const patternA = /([a-zA-Z]+)\s+(\d{4})\s*[–—\-to]+\s*([a-zA-Z]+|present|current|now)\s+(\d{4}|present|current|now)/gi;
  let m: RegExpExecArray | null;
  while ((m = patternA.exec(cvText)) !== null) {
    allRanges.push([`${m[1]} ${m[2]}`, /^(present|current|now)$/i.test(m[3]) && !m[4] ? "Present" : `${m[3]} ${m[4]}`]);
  }

  const patternB = /(\d{1,2}\/\d{4})\s*[–—\-to]+\s*(\d{1,2}\/\d{4}|present|current|now)/gi;
  while ((m = patternB.exec(cvText)) !== null) {
    allRanges.push([m[1], /^(present|current|now)$/i.test(m[2]) ? "Present" : m[2]]);
  }

  const patternC = /(\d{4})\s*[–—\-to]+\s*(\d{4})/g;
  while ((m = patternC.exec(cvText)) !== null) {
    allRanges.push([m[1], m[2]]);
  }

  for (const [startStr, endStr] of allRanges) {
    const months = monthsBetween(startStr, endStr, now);
    if (months > 0) {
      const startD = parseDate(startStr);
      const endD = /^(present|current|now)$/i.test(endStr.trim()) ? now : parseDate(endStr) ?? now;
      if (startD) {
        const startMonth = startD.getFullYear() * 12 + startD.getMonth();
        const endMonth = endD.getFullYear() * 12 + endD.getMonth();
        intervals.push({ start: startMonth, end: endMonth });
      }
    }
  }

  if (intervals.length === 0) return explicit;

  intervals.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    if (intervals[i].start <= last.end) {
      last.end = Math.max(last.end, intervals[i].end);
    } else {
      merged.push(intervals[i]);
    }
  }

  let totalMonths = 0;
  for (const iv of merged) totalMonths += iv.end - iv.start;

  return Math.max(explicit, Math.floor(totalMonths / 12));
}

export function estimateRequiredYears(jobText: string): number {
  const m = jobText.match(/(\d+)\+?\s*(years|yrs)/i);
  return m ? parseInt(m[1], 10) : 0;
}

const DEGREE_RANKS: { re: RegExp; rank: number }[] = [
  { re: /\b(ph\.?\s?d|doctorate|doctoral)\b/i, rank: 4 },
  { re: /\b(master'?s?|m\.?\s?sc|m\.?\s?s\b|mba|m\.?\s?tech|m\.?\s?eng)\b/i, rank: 3 },
  { re: /\b(bachelor'?s?|b\.?\s?sc|b\.?\s?s\b|b\.?\s?tech|b\.?\s?eng|undergraduate|under-?grad)\b/i, rank: 2 },
  { re: /\b(diploma|associate'?s?)\b/i, rank: 1 },
];

export function degreeRank(text: string): number {
  let max = 0;
  for (const { re, rank } of DEGREE_RANKS) if (re.test(text)) max = Math.max(max, rank);
  return max;
}

export function educationScore(jobText: string, cvText: string): number {
  const required = degreeRank(jobText);
  const have = degreeRank(cvText);
  if (required === 0) return 80;
  if (have >= required) return 100;
  if (have > 0) return 60;
  return 40;
}

export function locationScore(jobLocation: string, cvText: string): number {
  const loc = (jobLocation ?? "").trim().toLowerCase();
  if (!loc || loc === "—") return 70;
  if (loc.includes("remote") || loc.includes("anywhere")) return 100;
  const places = loc
    .split(/[,/]|\s-\s|\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const cv = cvText.toLowerCase();
  return places.some((p) => cv.includes(p)) ? 100 : 55;
}

/** Weighted blend of the five factors → 0..100 integer. */
export function blendScore(
  semantic: number,
  skills: number,
  seniority: number,
  education: number,
  location: number
): number {
  return Math.round(
    semantic * WEIGHTS.semantic +
      skills * WEIGHTS.skills +
      seniority * WEIGHTS.seniority +
      education * WEIGHTS.education +
      location * WEIGHTS.location
  );
}

export function explainFit(b: Omit<FitBreakdown, "explanation">): string {
  const tier = b.score >= 75 ? "Strong match" : b.score >= 55 ? "Possible match" : "Stretch";
  const required = b.matchedSkills.length + b.missingSkills.length;
  const parts = [
    `${tier} — ${b.score}/100.`,
    `Semantic ${b.semantic}, skills ${b.skills} (matched ${b.matchedSkills.length}/${required}),`,
    `seniority ${b.seniority}, education ${b.education}, location ${b.location}.`,
  ];
  if (b.missingSkills.length) {
    parts.push(`Close these gaps: ${b.missingSkills.slice(0, 5).join(", ")}.`);
  } else if (required > 0) {
    parts.push("No major skill gaps.");
  }
  return parts.join(" ");
}
