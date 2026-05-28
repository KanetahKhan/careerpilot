import { NextResponse } from "next/server";
import { z } from "zod";
import { getCvProfile } from "@/lib/services/profile";
import { parseBuilderFromSections, transformBackendData } from "@/lib/cv-transform";
import { generateObjectWithFallback, AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import type { PortfolioData } from "@/types/portfolio";

export const runtime = "nodejs";
export const maxDuration = 60;

// ── helpers ──────────────────────────────────────────────────────────────────

/** Public origin of the current request (proxy-aware), for building share URLs. */
function originOf(req: Request): string {
  const h = req.headers;
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(req.url).origin;
}

function slugifyName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "portfolio";
}

/** Resolve a slug that is unique across the table, excluding the caller's own row. */
async function resolveSlug(
  supabase: ReturnType<typeof createAdminClient>,
  name: string,
  ownUserId: string,
): Promise<string> {
  const base = slugifyName(name);
  const candidates = [base, ...Array.from({ length: 5 }, () => `${base}-${Math.random().toString(36).slice(2, 6)}`)];
  for (const slug of candidates) {
    const { data } = await supabase
      .from("portfolios")
      .select("user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data || (data as { user_id: string }).user_id === ownUserId) return slug;
  }
  // Extremely unlikely fallthrough — guarantee uniqueness with a timestamp suffix.
  return `${base}-${Date.now().toString(36)}`;
}

/**
 * ONE grounded LLM call: polish headline + summary + per-project blurbs.
 * HARD RULE enforced in the system prompt — only rephrase real CV content,
 * never invent facts. Best-effort: on any failure we keep the raw snapshot.
 */
async function polishSnapshot(snapshot: PortfolioData): Promise<PortfolioData> {
  if (snapshot.experience.length === 0 && snapshot.projects.length === 0 && !snapshot.summary) {
    return snapshot;
  }

  const PolishSchema = z.object({
    headline: z.string().describe("A concise professional headline, max ~10 words."),
    summary: z.string().describe("A polished 2-3 sentence professional summary."),
    projectBlurbs: z
      .array(z.object({ name: z.string(), blurb: z.string() }))
      .describe("One <=1 sentence blurb per project, keyed by the exact project name."),
  });

  const cvContext = JSON.stringify(
    {
      name: snapshot.name,
      currentHeadline: snapshot.headline,
      currentSummary: snapshot.summary,
      experience: snapshot.experience.map((e) => ({
        title: e.title,
        company: e.company,
        bullets: e.bullets,
      })),
      projects: snapshot.projects.map((p) => ({ name: p.name, description: p.description, tech: p.tech })),
      skills: snapshot.skills,
    },
    null,
    2,
  );

  try {
    const { object } = await generateObjectWithFallback({
      schema: PolishSchema,
      schemaName: "PortfolioPolish",
      temperature: 0.3,
      system:
        "You rephrase a candidate's REAL CV content into polished portfolio copy. " +
        "HARD RULE: only rephrase facts that are present in the provided CV. NEVER invent " +
        "skills, employers, titles, dates, metrics, or projects. If a field is empty, return " +
        "a faithful summary of what is present without adding anything new. Keep it truthful, " +
        "concise, and first-person-neutral (no 'I').",
      prompt:
        `Polish the headline, summary, and project blurbs for this candidate. ` +
        `Return one blurb per project using the EXACT project name as the key.\n\nCV:\n${cvContext}`,
    });

    const blurbByName = new Map(
      object.projectBlurbs.map((b) => [b.name.trim().toLowerCase(), b.blurb.trim()]),
    );

    return {
      ...snapshot,
      headline: object.headline.trim() || snapshot.headline,
      summary: object.summary.trim() || snapshot.summary,
      projects: snapshot.projects.map((p) => {
        const blurb = blurbByName.get(p.name.trim().toLowerCase());
        return blurb ? { ...p, description: blurb } : p;
      }),
    };
  } catch {
    // Polish is best-effort; a grounded-but-unpolished snapshot is still valid.
    return snapshot;
  }
}

/** Build the public snapshot from the user's already-parsed CV (no re-parsing). */
function buildSnapshot(
  profile: Awaited<ReturnType<typeof getCvProfile>>,
  includeContact: boolean,
): PortfolioData {
  const cv = parseBuilderFromSections(profile.sections);
  const personal = transformBackendData(profile).personal;

  const name = cv.fullName?.trim() || personal.name || "";
  const fallbackHeadline =
    cv.headline?.trim() ||
    (cv.experience[0] ? `${cv.experience[0].title} at ${cv.experience[0].company}` : "") ||
    cv.education[0]?.degree ||
    "";

  const snapshot: PortfolioData = {
    name,
    headline: fallbackHeadline,
    summary: cv.summary?.trim() ?? "",
    experience: cv.experience.map((e) => ({
      title: e.title,
      company: e.company,
      start: e.start,
      end: e.end,
      bullets: e.bullets.filter(Boolean),
    })),
    projects: cv.projects.map((p) => ({
      name: p.name,
      description: p.description,
      tech: p.tech,
    })),
    skills: cv.skills,
    education: cv.education.map((e) => ({
      degree: e.degree,
      institution: e.institution,
      start: e.start,
      end: e.end,
      details: e.details,
    })),
  };

  if (includeContact) {
    const contact: NonNullable<PortfolioData["contact"]> = {};
    if (personal.email) contact.email = personal.email;
    if (personal.phone) contact.phone = personal.phone;
    if (personal.location) contact.location = personal.location;
    if (personal.linkedin) contact.linkedin = personal.linkedin;
    if (personal.github) contact.github = personal.github;
    if (personal.website) contact.website = personal.website;
    if (Object.keys(contact).length > 0) snapshot.contact = contact;
  }

  return snapshot;
}

// ── handlers ───────────────────────────────────────────────────────────────

/** POST — generate/publish: snapshot the CV, polish it, assign a slug, publish. */
export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));
    const includeContact = body?.includeContact === true;

    const profile = await getCvProfile(user.id);
    if (!profile || profile.totalChunks === 0) {
      return NextResponse.json(
        { error: "No CV found. Upload or build a CV first." },
        { status: 400 },
      );
    }

    const snapshot = await polishSnapshot(buildSnapshot(profile, includeContact));

    const supabase = createAdminClient();

    // Reuse the existing slug on regenerate so shared links stay stable.
    const { data: existing } = await supabase
      .from("portfolios")
      .select("slug")
      .eq("user_id", user.id)
      .maybeSingle();
    const slug = (existing as { slug: string } | null)?.slug
      ?? (await resolveSlug(supabase, snapshot.name || "portfolio", user.id));

    const { error } = await supabase.from("portfolios").upsert(
      {
        user_id: user.id,
        slug,
        data: snapshot,
        published: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ slug, url: `${originOf(req)}/p/${slug}`, published: true });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: e?.message ?? "Failed to generate portfolio" }, { status: 500 });
  }
}

/** GET — return the caller's own portfolio + published state (or null). */
export async function GET(req: Request) {
  try {
    const user = await requireUser();
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("portfolios")
      .select("slug, published, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) return NextResponse.json({ portfolio: null });
    const row = data as { slug: string; published: boolean; updated_at: string };
    return NextResponse.json({
      portfolio: {
        slug: row.slug,
        published: row.published,
        url: `${originOf(req)}/p/${row.slug}`,
        updatedAt: row.updated_at,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load portfolio" }, { status: 500 });
  }
}

const PatchSchema = z.object({ published: z.boolean() });

/** PATCH — toggle published without regenerating the snapshot. */
export async function PATCH(req: Request) {
  try {
    const user = await requireUser();
    const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Expected { published: boolean }" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("portfolios")
      .update({ published: parsed.data.published, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .select("slug, published")
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "No portfolio to update" }, { status: 404 });

    const row = data as { slug: string; published: boolean };
    return NextResponse.json({
      slug: row.slug,
      published: row.published,
      url: `${originOf(req)}/p/${row.slug}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to update portfolio" }, { status: 500 });
  }
}
