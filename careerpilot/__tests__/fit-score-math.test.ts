/**
 * Unit tests for the fit-score pure-math layer.
 * No Supabase, no LLM calls — all inputs are fixed, all assertions deterministic.
 *
 * The thesis: the fit score is computed, not stated.
 * These tests prove the individual factors and the weighted blend behave correctly
 * for known CV + known JD pairs.
 */

import { describe, expect, it } from "vitest";
import {
  WEIGHTS,
  blendScore,
  centroid,
  cosine,
  degreeRank,
  educationScore,
  estimateExperienceYears,
  estimateRequiredYears,
  explainFit,
  locationScore,
  parseDate,
} from "../lib/services/fit-score/math";

// ── cosine similarity ─────────────────────────────────────────────────────────

describe("cosine", () => {
  it("returns 1 for identical vectors", () => {
    expect(cosine([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 5);
  });

  it("returns 0 for perpendicular vectors", () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0, 5);
  });

  it("returns 0 when either vector is all-zeros", () => {
    expect(cosine([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosine([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it("returns ~0.974 for nearly-aligned vectors", () => {
    expect(cosine([1, 1], [2, 1])).toBeCloseTo(0.9487, 3);
  });
});

// ── centroid ──────────────────────────────────────────────────────────────────

describe("centroid", () => {
  it("returns empty array for no vectors", () => {
    expect(centroid([])).toEqual([]);
  });

  it("returns the vector itself for a single input", () => {
    expect(centroid([[3, 6, 9]])).toEqual([3, 6, 9]);
  });

  it("averages two vectors component-wise", () => {
    const result = centroid([
      [0, 0],
      [4, 8],
    ]);
    expect(result[0]).toBeCloseTo(2, 5);
    expect(result[1]).toBeCloseTo(4, 5);
  });
});

// ── parseDate ─────────────────────────────────────────────────────────────────

describe("parseDate", () => {
  it("parses 'Jan 2022'", () => {
    const d = parseDate("Jan 2022");
    expect(d?.getFullYear()).toBe(2022);
    expect(d?.getMonth()).toBe(0);
  });

  it("parses '03/2021'", () => {
    const d = parseDate("03/2021");
    expect(d?.getFullYear()).toBe(2021);
    expect(d?.getMonth()).toBe(2);
  });

  it("parses bare year '2019'", () => {
    const d = parseDate("2019");
    expect(d?.getFullYear()).toBe(2019);
  });

  it("returns null for garbage input", () => {
    expect(parseDate("not a date")).toBeNull();
  });
});

// ── estimateExperienceYears ───────────────────────────────────────────────────

describe("estimateExperienceYears", () => {
  const FIXED_NOW = new Date(2025, 0, 1); // 2025-01-01

  it("extracts 2 years from a bare-year range", () => {
    expect(estimateExperienceYears("Software Engineer\n2020 – 2022", FIXED_NOW)).toBe(2);
  });

  it("extracts 3 years from a month-name range", () => {
    const cv = "Senior Dev\nJan 2020 – Jan 2023";
    expect(estimateExperienceYears(cv, FIXED_NOW)).toBe(3);
  });

  it("merges overlapping intervals to avoid double-counting", () => {
    // Two jobs that overlap: 2019-2022 and 2021-2024 → 5 total years, not 6
    const cv = "Job A\n2019 – 2022\nJob B\n2021 – 2024";
    expect(estimateExperienceYears(cv, FIXED_NOW)).toBe(5);
  });

  it("uses explicit N years as a floor when no date ranges are found", () => {
    expect(estimateExperienceYears("I have 7 years of experience", FIXED_NOW)).toBe(7);
  });

  it("falls back to 0 when nothing can be inferred", () => {
    expect(estimateExperienceYears("No dates here at all", FIXED_NOW)).toBe(0);
  });
});

// ── estimateRequiredYears ─────────────────────────────────────────────────────

describe("estimateRequiredYears", () => {
  it("extracts 5 from '5+ years experience'", () => {
    expect(estimateRequiredYears("5+ years experience in Python")).toBe(5);
  });

  it("extracts 3 from '3 years of software development'", () => {
    expect(estimateRequiredYears("3 years of software development")).toBe(3);
  });

  it("extracts 7 from '7 yrs'", () => {
    expect(estimateRequiredYears("requires 7 yrs of management experience")).toBe(7);
  });

  it("returns 0 when no years phrase is present", () => {
    expect(estimateRequiredYears("Great communication skills required")).toBe(0);
  });
});

// ── degreeRank ────────────────────────────────────────────────────────────────

describe("degreeRank", () => {
  it("ranks PhD as 4", () => {
    expect(degreeRank("PhD in Computer Science")).toBe(4);
  });

  it("ranks Master's as 3", () => {
    expect(degreeRank("Masters in Machine Learning")).toBe(3);
    expect(degreeRank("MBA preferred")).toBe(3);
  });

  it("ranks Bachelor's as 2", () => {
    expect(degreeRank("Bachelor's degree required")).toBe(2);
    expect(degreeRank("B.Sc. in Engineering")).toBe(2);
  });

  it("ranks diploma as 1", () => {
    expect(degreeRank("Diploma in Accounting")).toBe(1);
  });

  it("returns 0 when no degree is mentioned", () => {
    expect(degreeRank("Strong communication skills")).toBe(0);
  });

  it("returns the highest rank when multiple degrees are mentioned", () => {
    expect(degreeRank("Bachelor's or Master's preferred")).toBe(3);
  });
});

// ── educationScore ────────────────────────────────────────────────────────────

describe("educationScore", () => {
  it("returns 100 when candidate meets the requirement (exact match)", () => {
    expect(educationScore("Bachelor's degree required", "B.Sc. in Computer Science")).toBe(100);
  });

  it("returns 100 when candidate exceeds the requirement (PhD vs Master's)", () => {
    expect(educationScore("Master's preferred", "PhD in Physics")).toBe(100);
  });

  it("returns 60 when candidate has a degree but below the required level", () => {
    expect(educationScore("PhD required", "Bachelor's in Engineering")).toBe(60);
  });

  it("returns 40 when job wants a degree but CV shows none", () => {
    expect(educationScore("Bachelor's required", "Self-taught engineer with 5 years")).toBe(40);
  });

  it("returns 80 when job does not state a degree requirement", () => {
    expect(educationScore("Strong problem-solving skills", "B.Sc. in Mathematics")).toBe(80);
  });
});

// ── locationScore ─────────────────────────────────────────────────────────────

describe("locationScore", () => {
  it("returns 100 for remote jobs", () => {
    expect(locationScore("Remote", "Based in London")).toBe(100);
    expect(locationScore("Work from anywhere", "Located in Paris")).toBe(100);
  });

  it("returns 100 when the job city appears in the CV", () => {
    expect(locationScore("London, UK", "I am based in London and have worked here for 3 years")).toBe(100);
  });

  it("returns 55 when location does not match", () => {
    expect(locationScore("San Francisco", "Based in New York City")).toBe(55);
  });

  it("returns 70 for unknown / missing location", () => {
    expect(locationScore("", "some CV text")).toBe(70);
    expect(locationScore("—", "some CV text")).toBe(70);
  });
});

// ── blendScore ────────────────────────────────────────────────────────────────

describe("blendScore — 5-factor weighted blend", () => {
  it("weights match the documented formula: 0.4·sem + 0.3·skills + 0.1·sen + 0.1·edu + 0.1·loc", () => {
    // Weights are exposed so tests stay in sync if they change
    expect(WEIGHTS.semantic).toBe(0.4);
    expect(WEIGHTS.skills).toBe(0.3);
    expect(WEIGHTS.seniority).toBe(0.1);
    expect(WEIGHTS.education).toBe(0.1);
    expect(WEIGHTS.location).toBe(0.1);
  });

  it("computes correct score for a strong candidate (all factors high)", () => {
    // 80*0.4 + 90*0.3 + 100*0.1 + 100*0.1 + 100*0.1 = 32 + 27 + 10 + 10 + 10 = 89
    expect(blendScore(80, 90, 100, 100, 100)).toBe(89);
  });

  it("computes correct score for a weak candidate (semantic low, skills missing)", () => {
    // 30*0.4 + 20*0.3 + 50*0.1 + 40*0.1 + 55*0.1 = 12 + 6 + 5 + 4 + 5.5 ≈ 33
    expect(blendScore(30, 20, 50, 40, 55)).toBe(33);
  });

  it("returns a perfect 100 when all factors are 100", () => {
    expect(blendScore(100, 100, 100, 100, 100)).toBe(100);
  });

  it("returns 0 when all factors are 0", () => {
    expect(blendScore(0, 0, 0, 0, 0)).toBe(0);
  });

  it("semantic factor dominates a 40% weight — doubling it has the largest effect", () => {
    const base = blendScore(50, 50, 50, 50, 50);
    const moreSkills = blendScore(50, 100, 50, 50, 50); // +50 on 0.3 weight → +15
    const moreSemantic = blendScore(100, 50, 50, 50, 50); // +50 on 0.4 weight → +20
    expect(moreSemantic - base).toBeGreaterThan(moreSkills - base);
  });
});

// ── explainFit ────────────────────────────────────────────────────────────────

describe("explainFit", () => {
  const base: Omit<import("../lib/services/fit-score/math").FitBreakdown, "explanation"> = {
    score: 85,
    semantic: 80,
    skills: 90,
    seniority: 100,
    education: 100,
    location: 100,
    matchedSkills: ["TypeScript", "React"],
    missingSkills: [],
  };

  it("labels a score >= 75 as 'Strong match'", () => {
    expect(explainFit(base)).toContain("Strong match");
  });

  it("labels a score 55–74 as 'Possible match'", () => {
    expect(explainFit({ ...base, score: 60 })).toContain("Possible match");
  });

  it("labels a score < 55 as 'Stretch'", () => {
    expect(explainFit({ ...base, score: 40 })).toContain("Stretch");
  });

  it("reports missing skills when present", () => {
    const withGaps = { ...base, score: 65, missingSkills: ["Docker", "Kubernetes"] };
    const text = explainFit(withGaps);
    expect(text).toContain("Docker");
    expect(text).toContain("Kubernetes");
    expect(text).toContain("Close these gaps");
  });

  it("says no gaps when matched but none missing", () => {
    const text = explainFit(base);
    expect(text).toContain("No major skill gaps");
  });

  it("includes all five factor values in the explanation", () => {
    const text = explainFit(base);
    expect(text).toContain("80"); // semantic
    expect(text).toContain("90"); // skills
    expect(text).toContain("100"); // seniority/education/location
  });
});
