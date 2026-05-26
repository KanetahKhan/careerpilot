import { createAdminClient } from "@/lib/supabase";
import { embedText, generateObjectWithFallback } from "@/lib/ai";
import { z } from "zod";

export type FitBreakdown = {
  score: number; // 0..100 (weighted blend)
  semantic: number; // 0..100
  skills: number; // 0..100
  seniority: number; // 0..100
  education: number; // 0..100
  location: number; // 0..100
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
};

/**
 * The per-request CV snapshot — everything that's identical across all jobs in a
 * single search, so we compute it once instead of once per job.
 */
export type CvContext = {
  text: string;
  centroid: number[];
  skills: Set<string>;
  years: number;
};

/** Five programmatic factors. Tuned so semantic + skills still dominate. */
const WEIGHTS = {
  semantic: 0.4,
  skills: 0.3,
  seniority: 0.1,
  education: 0.1,
  location: 0.1,
};

function cosine(a: number[], b: number[]): number {
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

function centroid(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0].length;
  const out = new Array(dim).fill(0);
  for (const v of vectors) for (let i = 0; i < dim; i++) out[i] += v[i];
  for (let i = 0; i < dim; i++) out[i] /= vectors.length;
  return out;
}

/** Extract a normalized skill list from arbitrary text via structured output. */
async function extractSkills(text: string, label: string): Promise<string[]> {
  try {
    const { object } = await generateObjectWithFallback({
      schema: z.object({ skills: z.array(z.string()) }),
      prompt: `Extract a flat list of concrete technical skills, tools, languages, and frameworks mentioned in the following ${label}. Return lowercase, deduplicated, no soft skills.\n\n${text.slice(0, 6000)}`,
    });
    return [...new Set(object.skills.map((s) => s.toLowerCase().trim()))].filter(Boolean);
  } catch {
    return [];
  }
}

/** Months elapsed for a [start, end) half-open interval (end can be "Present"). */
function monthsBetween(start: string, end: string, now: Date): number {
  const startD = parseDate(start);
  if (!startD) return 0;
  const endD = /^(present|current|now)$/i.test(end.trim()) ? now : parseDate(end) ?? now;
  return Math.max(0, (endD.getFullYear() - startD.getFullYear()) * 12 + endD.getMonth() - startD.getMonth());
}

/** Parse a date from supported formats. Returns null on failure. */
// "Jan 2022" / "January 2022"
const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8,
  september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};
function parseDate(s: string): Date | null {
  const trimmed = s.trim();
  // "MM/YYYY" or "MM/DD/YYYY"
  const slashM = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashM) {
    const m = parseInt(slashM[1], 10) - 1;
    return m >= 0 && m <= 11 ? new Date(parseInt(slashM[2], 10), m) : null;
  }
  // "MonthName YYYY" — e.g. "Jan 2022" or "January 2022"
  const textM = trimmed.match(/^([a-zA-Z]+)\s+(\d{4})$/);
  if (textM) {
    const m = MONTH_NAMES[textM[1].toLowerCase()];
    return m !== undefined ? new Date(parseInt(textM[2], 10), m) : null;
  }
  // bare "YYYY"
  const yearM = trimmed.match(/^(\d{4})$/);
  if (yearM) return new Date(parseInt(yearM[1], 10), 0);
  return null;
}

/** Infer years of experience from date ranges in text. Merges overlapping
 *  intervals before summing to avoid double-counting.
 *
 *  Handles: "Jan 2022 – Present", "January 2022 to Current",
 *  "2021 – 2023", "06/2020 - 08/2021", "Mar 2019 — Feb 2021", "2020-2022".
 */
function estimateExperienceYears(cvText: string): number {
  // 1. Try explicit "N years" phrase first as a floor/fallback.
  const explicitM = cvText.match(/(\d+)\+?\s*(years|yrs)/i);
  const explicit = explicitM ? parseInt(explicitM[1], 10) : 0;

  const now = new Date();
  const intervals: { start: number; end: number }[] = [];
  const allRanges: [string, string][] = [];

  // Pattern A: "MonthName YYYY – MonthName YYYY" or "MonthName YYYY – Present"
  const patternA = /([a-zA-Z]+)\s+(\d{4})\s*[–—\-to]+\s*([a-zA-Z]+|present|current|now)\s+(\d{4}|present|current|now)/gi;
  let m: RegExpExecArray | null;
  while ((m = patternA.exec(cvText)) !== null) {
    allRanges.push([`${m[1]} ${m[2]}`, /^(present|current|now)$/i.test(m[3]) && !m[4] ? "Present" : `${m[3]} ${m[4]}`]);
  }

  // Pattern B: "MM/YYYY – MM/YYYY"
  const patternB = /(\d{1,2}\/\d{4})\s*[–—\-to]+\s*(\d{1,2}\/\d{4}|present|current|now)/gi;
  while ((m = patternB.exec(cvText)) !== null) {
    allRanges.push([m[1], /^(present|current|now)$/i.test(m[2]) ? "Present" : m[2]]);
  }

  // Pattern C: "YYYY – YYYY" (bare years)
  const patternC = /(\d{4})\s*[–—\-to]+\s*(\d{4})/g;
  while ((m = patternC.exec(cvText)) !== null) {
    allRanges.push([m[1], m[2]]);
  }

  // Pattern D: "MM/YYYY - MM/YYYY" without spaces (already covered by B with optional spaces)

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

  // Merge overlapping intervals
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

  // Sum total months
  let totalMonths = 0;
  for (const iv of merged) {
    totalMonths += iv.end - iv.start;
  }

  const inferred = Math.floor(totalMonths / 12);
  return Math.max(explicit, inferred);
}

/**
 * Estimate years of experience a job REQUIRES by matching explicit
 * "N+ years" / "N yrs" phrases. This is what job descriptions say,
 * not what a candidate has — so date-range inference is inappropriate.
 */
function estimateRequiredYears(jobText: string): number {
  const m = jobText.match(/(\d+)\+?\s*(years|yrs)/i);
  if (m) return parseInt(m[1], 10);
  return 0;
}

// ── Education: rank the highest degree mentioned in a block of text ───────────
const DEGREE_RANKS: { re: RegExp; rank: number }[] = [
  { re: /\b(ph\.?\s?d|doctorate|doctoral)\b/i, rank: 4 },
  { re: /\b(master'?s?|m\.?\s?sc|m\.?\s?s\b|mba|m\.?\s?tech|m\.?\s?eng)\b/i, rank: 3 },
  { re: /\b(bachelor'?s?|b\.?\s?sc|b\.?\s?s\b|b\.?\s?tech|b\.?\s?eng|undergraduate|under-?grad)\b/i, rank: 2 },
  { re: /\b(diploma|associate'?s?)\b/i, rank: 1 },
];

function degreeRank(text: string): number {
  let max = 0;
  for (const { re, rank } of DEGREE_RANKS) if (re.test(text)) max = Math.max(max, rank);
  return max;
}

/** Education match: candidate's highest degree vs. the level the job asks for. */
function educationScore(jobText: string, cvText: string): number {
  const required = degreeRank(jobText);
  const have = degreeRank(cvText);
  if (required === 0) return 80; // job states no degree requirement → neutral-positive
  if (have >= required) return 100; // meets/exceeds
  if (have > 0) return 60; // has a degree, just below the asked level
  return 40; // no degree found, job wants one
}

/** Location match: remote is universal; otherwise look for the job's place in the CV. */
function locationScore(jobLocation: string, cvText: string): number {
  const loc = (jobLocation ?? "").trim().toLowerCase();
  if (!loc || loc === "—") return 70; // unknown location → neutral
  if (loc.includes("remote") || loc.includes("anywhere")) return 100;
  const places = loc
    .split(/[,/]|\s-\s|\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const cv = cvText.toLowerCase();
  return places.some((p) => cv.includes(p)) ? 100 : 55; // same place vs. would-relocate
}

/**
 * Turn a computed breakdown into a short, human-readable justification.
 * SEPARATE CONCERN from scoring — this writes prose, it never decides numbers.
 */
export function explainFit(
  b: Omit<FitBreakdown, "explanation">
): string {
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

/**
 * Load everything about the user's CV that does NOT change between jobs: the CV
 * text, the embedding centroid, the extracted skill set, and years of experience.
 * Build this ONCE per request and pass it to computeFitScore so the expensive
 * CV-skill extraction (an LLM call) runs once, not once per job.
 */
export async function loadCvContext(userId: string): Promise<CvContext> {
  const supabase = createAdminClient();
  const { data: chunks } = await supabase
    .from("cv_chunks")
    .select("content, embedding")
    .eq("user_id", userId);

  const text = (chunks ?? []).map((c: any) => c.content).join("\n");
  const vectors: number[][] = (chunks ?? [])
    .map((c: any) => c.embedding)
    .filter(Boolean)
    .map((e: any) => (typeof e === "string" ? JSON.parse(e) : e));

  const skills = new Set(await extractSkills(text, "candidate CV"));
  return { text, centroid: centroid(vectors), skills, years: estimateExperienceYears(text) };
}

/**
 * Compute a fit score for a job description against a user's CV.
 * THIS IS PROGRAMMATIC — the number comes from TypeScript math, not from the
 * LLM "deciding" a score. The LLM only extracts skill lists; the five factors
 * (semantic, skills, seniority, education, location) and the weighted blend are
 * all computed here. The prose justification is delegated to explainFit().
 */
export async function computeFitScore(
  userId: string,
  jobDescription: string,
  jobLocation = "",
  cvContext?: CvContext
): Promise<FitBreakdown> {
  // Reuse a prebuilt CV context when scoring many jobs; otherwise load it now.
  const cv = cvContext ?? (await loadCvContext(userId));

  // Semantic similarity: job embedding vs. CV centroid.
  const jobEmbedding = await embedText(jobDescription);
  const sem = cv.centroid.length ? Math.max(0, cosine(jobEmbedding, cv.centroid)) : 0;
  const semantic = Math.round(sem * 100);

  // Skill overlap (matched / required). Only the JOB skills are extracted here;
  // the CV skills come from the context, so they're extracted once per request.
  const jobSkills = await extractSkills(jobDescription, "job description");
  const matched = jobSkills.filter((s) => cv.skills.has(s));
  const missing = jobSkills.filter((s) => !cv.skills.has(s));
  const skills =
    jobSkills.length === 0 ? 60 : Math.round((matched.length / jobSkills.length) * 100);

  // Seniority match (years).
  const required = estimateRequiredYears(jobDescription);
  const seniority = required === 0 ? 80 : cv.years >= required ? 100 : 50;

  // Education + location match (pure, deterministic string analysis).
  const education = educationScore(jobDescription, cv.text);
  const location = locationScore(jobLocation, cv.text);

  // 6. Weighted blend.
  const score = Math.round(
    semantic * WEIGHTS.semantic +
      skills * WEIGHTS.skills +
      seniority * WEIGHTS.seniority +
      education * WEIGHTS.education +
      location * WEIGHTS.location
  );

  const base: Omit<FitBreakdown, "explanation"> = {
    score,
    semantic,
    skills,
    seniority,
    education,
    location,
    matchedSkills: matched,
    missingSkills: missing,
  };

  return { ...base, explanation: explainFit(base) };
}
