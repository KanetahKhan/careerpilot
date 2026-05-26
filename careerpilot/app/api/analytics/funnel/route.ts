import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listApplications } from "@/lib/services/tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AppRow = {
  id: string;
  role: string | null;
  company: string | null;
  status: string | null;
  fit_score: number | null;
  created_at: string | null;
};

type Stages = { applied: number; interview: number; offer: number };
type Rates = { appliedToInterview: number; interviewToOffer: number };

type Insight = {
  metric: string;
  values: { label: string; n: number; rate: number }[];
  takeaway: string;
};

function safePct(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

function reachedInterview(s: string | null): boolean {
  return s === "interviewing" || s === "offer";
}
function reachedOffer(s: string | null): boolean {
  return s === "offer";
}

/**
 * Pick the most interesting numerical slice we can defend:
 *   1. fit-score buckets (<60 vs ≥75) — if both buckets have ≥2 apps;
 *   2. otherwise role-keyword buckets, taking the two biggest groups.
 *
 * The takeaway sentence is templated from the computed numbers — no LLM is
 * involved, so the prose can never drift from the data.
 */
function pickInsight(apps: AppRow[]): Insight {
  if (apps.length === 0) {
    return {
      metric: "none",
      values: [],
      takeaway: "Track a few applications to unlock analytics.",
    };
  }

  // --- Slice A: fit-score buckets ---
  const low = apps.filter((a) => typeof a.fit_score === "number" && (a.fit_score as number) < 60);
  const high = apps.filter((a) => typeof a.fit_score === "number" && (a.fit_score as number) >= 75);
  if (low.length >= 2 && high.length >= 2) {
    const lowRate = safePct(low.filter((a) => reachedInterview(a.status)).length, low.length);
    const highRate = safePct(high.filter((a) => reachedInterview(a.status)).length, high.length);
    const delta = highRate - lowRate;
    let takeaway: string;
    if (Math.abs(delta) < 10) {
      takeaway = `Interview rate is similar across fit scores (high-fit ${highRate}% vs low-fit ${lowRate}%). Fit alone isn't driving outcomes — look at how you're applying, not just where.`;
    } else if (delta > 0) {
      takeaway = `High-fit applications (≥75) reach interview ${highRate}% of the time vs ${lowRate}% for low-fit (<60). Lean into roles you actually match.`;
    } else {
      takeaway = `Low-fit applications are converting better (${lowRate}% vs ${highRate}%). Worth checking whether fit scores reflect what these employers actually want.`;
    }
    return {
      metric: "interview rate by fit score",
      values: [
        { label: "low fit (<60)", n: low.length, rate: lowRate },
        { label: "high fit (≥75)", n: high.length, rate: highRate },
      ],
      takeaway,
    };
  }

  // --- Slice B: role-keyword buckets (top two with enough volume) ---
  const KEYWORDS: { key: string; re: RegExp }[] = [
    { key: "frontend", re: /front[\s-]?end|react|vue|svelte|ui\b/i },
    { key: "backend", re: /back[\s-]?end|node|django|rails|java|go\b|spring/i },
    { key: "fullstack", re: /full[\s-]?stack/i },
    { key: "data", re: /data|analyt|ml\b|ai\b|machine learning|nlp/i },
    { key: "mobile", re: /mobile|ios|android|flutter|react native/i },
    { key: "devops", re: /devops|sre|platform|infra|cloud/i },
    { key: "design", re: /design|ux\b|ui\b/i },
    { key: "product", re: /product manager|\bpm\b|product owner/i },
  ];
  const buckets = KEYWORDS.map((k) => {
    const matches = apps.filter((a) => k.re.test(`${a.role ?? ""} ${a.company ?? ""}`));
    const rate = safePct(matches.filter((a) => reachedInterview(a.status)).length, matches.length);
    return { label: k.key, n: matches.length, rate };
  })
    .filter((b) => b.n >= 2)
    .sort((a, b) => b.n - a.n);

  if (buckets.length >= 2) {
    const [best, worst] = [...buckets].sort((a, b) => b.rate - a.rate);
    const delta = best.rate - worst.rate;
    let takeaway: string;
    if (delta < 10) {
      takeaway = `Interview rates are even across your role types (${buckets
        .slice(0, 2)
        .map((b) => `${b.label} ${b.rate}%`)
        .join(", ")}). No category is pulling ahead yet.`;
    } else {
      takeaway = `${best.label} roles convert to interview ${best.rate}% of the time vs ${worst.rate}% for ${worst.label}. Consider concentrating effort where you're already landing replies.`;
    }
    return {
      metric: "interview rate by role type",
      values: buckets.slice(0, 4),
      takeaway,
    };
  }

  // --- Fallback: a single honest line ---
  const interviews = apps.filter((a) => reachedInterview(a.status)).length;
  const rate = safePct(interviews, apps.length);
  return {
    metric: "overall interview rate",
    values: [{ label: "all applications", n: apps.length, rate }],
    takeaway:
      apps.length < 5
        ? `Only ${apps.length} application(s) tracked so far — log a few more to unlock per-fit and per-role breakdowns.`
        : `${rate}% of your applications reach an interview. Track a few more to surface per-fit and per-role splits.`,
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    const { data, error } = await listApplications(user.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    const apps = (data ?? []) as AppRow[];

    const interview = apps.filter((a) => reachedInterview(a.status)).length;
    const offer = apps.filter((a) => reachedOffer(a.status)).length;
    const stages: Stages = { applied: apps.length, interview, offer };
    const rates: Rates = {
      appliedToInterview: safePct(interview, apps.length),
      interviewToOffer: safePct(offer, interview),
    };

    const insight = pickInsight(apps);

    return NextResponse.json({ stages, rates, insight });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to compute analytics" },
      { status: 500 }
    );
  }
}
