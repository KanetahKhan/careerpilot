import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  generateTextWithFallback,
  AI_BUSY_MESSAGE,
  isRateLimitError,
} from "@/lib/ai";
import { retrieveChunks, formatContext } from "@/lib/services/profile";
import { createApplication, createEvent } from "@/lib/services/tracker";
import { route, parseJson, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  role: z.string().min(1).max(300),
  company: z.string().min(1).max(300),
  location: z.string().max(300).optional(),
  description: z.string().max(20_000).optional().default(""),
  link: z.string().max(2000).optional(),
  fit_score: z.number().min(0).max(100).optional(),
  deadline: z.string().max(100).nullable().optional(),
});

/** Normalise an arbitrary date string to YYYY-MM-DD, or null if unparseable. */
function toDateOnly(s: string | null | undefined): string | null {
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD `days` from today (local-safe via UTC date math). */
function daysFromToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * One-click Apply: chains the three pillars into a single action —
 *   1. Generate a CV-grounded cover letter (best-effort; never fabricates).
 *   2. Create the tracker application (status "applied").
 *   3. Drop a calendar event — the real deadline if the posting has one,
 *      otherwise a follow-up reminder 7 days out so the date is actionable.
 *
 * Steps 2 & 3 run first so the tracker/calendar update even if the LLM is
 * rate-limited; the cover letter is returned when it succeeds.
 */
export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  await enforceRateLimit(user.id, "apply", "medium");
  const { role, company, location, description, link, fit_score, deadline } = await parseJson(req, BodySchema);
  const warnings: string[] = [];

  // 1. Tracker application (guaranteed — independent of the LLM).
  const { data: application, error: appErr } = await createApplication(user.id, {
    role,
    company,
    location: location ?? null,
    fit_score: fit_score ?? null,
    link: link ?? null,
    status: "applied",
  });
  if (appErr || !application) {
    throw new ApiError(appErr?.message ?? "Could not create the application", 500);
  }

  // 2. Calendar event — real deadline, else a 7-day follow-up reminder.
  const deadlineDate = toDateOnly(deadline);
  const eventInput = deadlineDate
    ? { title: `Deadline · ${role} @ ${company}`, event_date: deadlineDate, type: "deadline" as const }
    : { title: `Follow up · ${role} @ ${company}`, event_date: daysFromToday(7), type: "reminder" as const };
  const { data: event, error: evtErr } = await createEvent(user.id, {
    ...eventInput,
    related_application_id: application.id,
  });
  if (evtErr) {
    console.error("apply: calendar event failed —", evtErr.message);
    warnings.push("Couldn't add the calendar event (is the events table migrated?).");
  }

  // 3. CV-grounded cover letter (best-effort). Skipped cleanly if no CV.
  let coverLetter: string | null = null;
  try {
    const chunks = await retrieveChunks(user.id, `${role} at ${company}\n${description}`.trim(), 6);
    if (chunks.length === 0) {
      warnings.push("Cover letter skipped — upload your CV to generate a grounded letter.");
    } else {
      const { text } = await generateTextWithFallback({
        system: `You are CareerPilot's cover-letter writer. Write a concise (≈250-word), specific cover letter
for the role below, grounded STRICTLY in the candidate's CV context.

RULES:
- Quote/reference only real experience, skills, and projects from the CV context. NEVER invent anything.
- Open with "Dear Hiring Manager," and close with "Sincerely,". Leave the signature as the candidate's name if present in the CV, otherwise omit it.
- 3 short paragraphs: hook + why this role, then 1-2 concrete proof points from the CV, then a confident close.
- Plain text only — no markdown, no placeholders like [Your Name] or [Company].

=== ROLE ===
${role} at ${company}${location ? ` (${location})` : ""}
${description ? `\n=== JOB DESCRIPTION ===\n${description.slice(0, 6000)}` : ""}

=== CANDIDATE CV CONTEXT (the only source of truth) ===
${formatContext(chunks)}
=======================================================`,
        messages: [{ role: "user", content: `Write the cover letter for ${role} at ${company}.` }],
      });
      coverLetter = (text ?? "").trim() || null;
      if (!coverLetter) warnings.push("Cover letter came back empty — you can retry from the assistant.");
    }
  } catch (e) {
    warnings.push(
      isRateLimitError(e)
        ? AI_BUSY_MESSAGE
        : "Application saved, but the cover letter failed to generate."
    );
  }

  return NextResponse.json({
    application,
    event: event ?? null,
    coverLetter,
    warning: warnings.length ? warnings.join(" · ") : null,
  });
});
