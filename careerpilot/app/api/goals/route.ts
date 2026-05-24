import { NextRequest, NextResponse } from "next/server";
import { listGoals, createGoal, setGoalDone } from "@/lib/services/tracker";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await listGoals();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goals: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await createGoal(body.title, body.due_date);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}

export async function PATCH(req: NextRequest) {
  const { id, done } = await req.json();
  const { data, error } = await setGoalDone(id, done);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ goal: data });
}
