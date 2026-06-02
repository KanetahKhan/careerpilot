import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import {
  allItemKeys,
  doneActionCount,
  roadmapPercent,
  totalActionCount,
  type PersistedRoadmap,
} from "@/lib/services/assistant";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ActiveRow = {
  id: string;
  goal: string;
  summary: string;
  plan: PersistedRoadmap;
  completed: Record<string, boolean> | null;
  created_at: string;
};

async function loadActive(userId: string): Promise<ActiveRow | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("roadmaps")
    .select("id, goal, summary, plan, completed, created_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as ActiveRow | null) ?? null;
}

function summarize(row: ActiveRow) {
  const plan = row.plan;
  const completed = row.completed ?? {};
  return {
    id: row.id,
    roadmap: plan,
    completed,
    progress: {
      done: doneActionCount(plan, completed),
      total: totalActionCount(plan),
      percent: roadmapPercent(plan, completed),
    },
  };
}

export async function GET() {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const row = await loadActive(user.id);
    if (!row) {
      return NextResponse.json({
        id: null,
        roadmap: null,
        completed: {},
        progress: { done: 0, total: 0, percent: 0 },
      });
    }
    return NextResponse.json(summarize(row));
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}

const PatchSchema = z.union([
  z.object({
    itemKey: z.string().min(1).max(40),
    done: z.boolean(),
  }),
  z.object({
    itemKeys: z.array(z.string().min(1).max(40)).min(1).max(50),
    done: z.boolean(),
  }),
]);

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const body = await req.json().catch(() => null);
    const parsed = PatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const row = await loadActive(user.id);
    if (!row) {
      return NextResponse.json(
        { error: "No active roadmap — generate one first." },
        { status: 404 }
      );
    }

    const valid = allItemKeys(row.plan);
    const keys = "itemKey" in parsed.data ? [parsed.data.itemKey] : parsed.data.itemKeys;
    const unknown = keys.find((k) => !valid.has(k));
    if (unknown) {
      return NextResponse.json(
        { error: `Unknown item key: ${unknown}` },
        { status: 400 }
      );
    }

    const next: Record<string, boolean> = { ...(row.completed ?? {}) };
    for (const k of keys) {
      if (parsed.data.done) next[k] = true;
      else delete next[k];
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("roadmaps")
      .update({ completed: next })
      .eq("id", row.id)
      .eq("user_id", user.id)
      .select("id, goal, summary, plan, completed, created_at")
      .single();
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(summarize(data as ActiveRow));
  } catch (e: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(e) },
      { status: 500 }
    );
  }
}
