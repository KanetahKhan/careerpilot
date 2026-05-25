import { NextRequest, NextResponse } from "next/server";
import { listGoals, createGoal, setGoalDone } from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  const { data, error } = await listGoals(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const { data, error } = await createGoal(user.id, body.title, body.due_date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  const { id, done } = await req.json();
  const { data, error } = await setGoalDone(id, user.id, done);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}
