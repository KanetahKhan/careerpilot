import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createGoal, createEvent } from "@/lib/services/tracker";

export const runtime = "nodejs";

const KeyedItem = z.object({ key: z.string(), text: z.string() });

const PersistedRoadmapSchema = z.object({
  goal: z.string(),
  summary: z.string(),
  weeks: z
    .array(
      z.object({
        week: z.number(),
        focus: z.string(),
        actions: z.array(KeyedItem),
        milestone: KeyedItem,
      })
    )
    .min(1),
  citedSections: z.array(z.string()),
});

const BodySchema = z.object({
  roadmap: PersistedRoadmapSchema,
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startDate must be YYYY-MM-DD")
    .optional(),
});

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add `days` to a YYYY-MM-DD string in UTC, returning YYYY-MM-DD. */
function addDaysISO(startISO: string, days: number): string {
  const d = new Date(`${startISO}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid roadmap" },
        { status: 400 }
      );
    }

    const { roadmap } = parsed.data;
    const startDate = parsed.data.startDate ?? todayISO();

    let goalsCreated = 0;
    let eventsCreated = 0;

    // Each week's actions land as goals due that week; the milestone becomes
    // ONE calendar event dated startDate + weekIndex*7 days. Failures per row
    // are swallowed so a single bad insert doesn't abort the rest of the plan.
    for (let i = 0; i < roadmap.weeks.length; i++) {
      const w = roadmap.weeks[i];
      const weekDate = addDaysISO(startDate, i * 7);

      let firstGoalId: string | null = null;
      for (const action of w.actions) {
        const title = action.text.trim();
        if (!title) continue;
        const { data, error } = await createGoal(user.id, title, weekDate);
        if (!error && data) {
          goalsCreated++;
          if (!firstGoalId) firstGoalId = (data as { id: string }).id;
        }
      }

      const milestoneTitle = `Week ${w.week}: ${w.focus} — ${w.milestone.text}`.slice(0, 200);
      const { error: evErr } = await createEvent(user.id, {
        title: milestoneTitle,
        event_date: weekDate,
        type: "deadline",
        related_goal_id: firstGoalId,
      });
      if (!evErr) eventsCreated++;
    }

    return NextResponse.json({ goalsCreated, eventsCreated });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to apply roadmap" },
      { status: 500 }
    );
  }
}
