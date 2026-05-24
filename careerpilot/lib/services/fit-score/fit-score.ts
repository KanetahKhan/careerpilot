import { supabaseAdmin } from "@/lib/supabase";
import { embedText, chatModel } from "@/lib/ai";
import { generateObject } from "ai";
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
    const { object } = await generateObject({
      model: chatModel,
      schema: z.object({ skills: z.array(z.string()) }),
      prompt: `Extract a flat list of concrete technical skills, tools, languages, and frameworks mentioned in the following ${label}. Return lowercase, deduplicated, no soft skills.\n\n${text.slice(0, 6000)}`,
    });
    return [...new Set(object.skills.map((s) => s.toLowerCase().trim()))].filter(Boolean);
  } catch {
    return [];
  }
}

function estimateYears(text: string): number {
  // crude but transparent: count explicit "N years" mentions, else infer from dates
  const m = text.match(/(\d+)\+?\s*(years|yrs)/i);
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
 * Compute a fit score for a job description against a user's CV.
 * THIS IS PROGRAMMATIC — the number comes from TypeScript math, not from the
 * LLM "deciding" a score. The LLM only extracts skill lists; the five factors
 * (semantic, skills, seniority, education, location) and the weighted blend are
 * all computed here. The prose justification is delegated to explainFit().
 */
export async function computeFitScore(
  userId: string,
  jobDescription: string,
  jobLocation = ""
): Promise<FitBreakdown> {
  const supabase = supabaseAdmin();

  // 1. Pull this user's CV chunks + their stored embeddings.
  const { data: chunks } = await supabase
    .from("cv_chunks")
    .select("content, embedding")
    .eq("user_id", userId);

  const cvText = (chunks ?? []).map((c: any) => c.content).join("\n");
  const cvVectors: number[][] = (chunks ?? [])
    .map((c: any) => c.embedding)
    .filter(Boolean)
    .map((e: any) => (typeof e === "string" ? JSON.parse(e) : e));

  // 2. Semantic similarity: job embedding vs. CV centroid.
  const jobEmbedding = await embedText(jobDescription);
  const cvCentroid = centroid(cvVectors);
  const sem = cvCentroid.length ? Math.max(0, cosine(jobEmbedding, cvCentroid)) : 0;
  const semantic = Math.round(sem * 100);

  // 3. Skill overlap (matched / required).
  const [jobSkills, cvSkills] = await Promise.all([
    extractSkills(jobDescription, "job description"),
    extractSkills(cvText, "candidate CV"),
  ]);
  const cvSet = new Set(cvSkills);
  const matched = jobSkills.filter((s) => cvSet.has(s));
  const missing = jobSkills.filter((s) => !cvSet.has(s));
  const skills =
    jobSkills.length === 0 ? 60 : Math.round((matched.length / jobSkills.length) * 100);

  // 4. Seniority match (years).
  const required = estimateYears(jobDescription);
  const have = estimateYears(cvText);
  const seniority = required === 0 ? 80 : have >= required ? 100 : 50;

  // 5. Education + location match (pure, deterministic string analysis).
  const education = educationScore(jobDescription, cvText);
  const location = locationScore(jobLocation, cvText);

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
