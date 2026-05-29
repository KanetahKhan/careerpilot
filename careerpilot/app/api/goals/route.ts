import { z } from "zod";
import { NextResponse } from "next/server";
import { listGoals, createGoal, setGoalDone } from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";
import { route, parseJson } from "@/lib/api";

export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().min(1).max(500),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "due_date must be YYYY-MM-DD").nullish(),
});

const PatchSchema = z.object({
  id: z.string().min(1),
  done: z.boolean(),
});

export const GET = route(async () => {
  const user = await requireUser();
  const { data, error } = await listGoals(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const { title, due_date } = await parseJson(req, CreateSchema);
  const { data, error } = await createGoal(user.id, title, due_date ?? null);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const { id, done } = await parseJson(req, PatchSchema);
  const { data, error } = await setGoalDone(id, user.id, done);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
});
