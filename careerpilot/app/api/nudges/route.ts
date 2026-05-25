import { NextRequest, NextResponse } from "next/server";
import { generateNudges, listNotifications, markNotificationRead } from "@/lib/services/tracker";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET() {
  const user = await requireUser();
  const { data, error } = await listNotifications(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data });
}

export async function POST() {
  try {
    const user = await requireUser();
    const notifications = await generateNudges(user.id);
    return NextResponse.json({ notifications });
  } catch (e: any) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    return NextResponse.json({ error: e?.message ?? "Could not generate nudges" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  const { id, read } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { data, error } = await markNotificationRead(id, user.id, read ?? true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
}
