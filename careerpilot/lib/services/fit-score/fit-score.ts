import { createAdminClient } from "@/lib/supabase";
import { embedText } from "@/lib/ai";
import { extractSkills } from "@/lib/services/profile/skills";
import {
  type FitBreakdown,
  WEIGHTS,
  cosine,
  centroid,
  educationScore,
  locationScore,
  estimateExperienceYears,
  estimateRequiredYears,
  blendScore,
  explainFit,
} from "./math";

export type { FitBreakdown };
export { explainFit };

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
  const cv = cvContext ?? (await loadCvContext(userId));

  const jobEmbedding = await embedText(jobDescription);
  const sem = cv.centroid.length ? Math.max(0, cosine(jobEmbedding, cv.centroid)) : 0;
  const semantic = Math.round(sem * 100);

  const jobSkills = await extractSkills(jobDescription, "job description");
  const matched = jobSkills.filter((s) => cv.skills.has(s));
  const missing = jobSkills.filter((s) => !cv.skills.has(s));
  const skills =
    jobSkills.length === 0 ? 60 : Math.round((matched.length / jobSkills.length) * 100);

  const required = estimateRequiredYears(jobDescription);
  const seniority = required === 0 ? 80 : cv.years >= required ? 100 : 50;

  const education = educationScore(jobDescription, cv.text);
  const location = locationScore(jobLocation, cv.text);

  const score = blendScore(semantic, skills, seniority, education, location);

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
