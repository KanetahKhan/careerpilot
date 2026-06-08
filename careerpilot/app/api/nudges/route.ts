import { z } from "zod";
import { NextResponse } from "next/server";
import { generateNudges, listNotifications, markNotificationRead } from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";
import { route, parseJson } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

const PatchSchema = z.object({
  id: z.string().min(1),
  read: z.boolean().optional(),
});

export const GET = route(async () => {
  const user = await requireUser();
  const { data, error } = await listNotifications(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notifications: data });
});

export const POST = route(async () => {
  const user = await requireUser();
  await enforceRateLimit(user.id, "nudges", "medium");
  const notifications = await generateNudges(user.id);
  return NextResponse.json({ notifications });
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  const { id, read } = await parseJson(req, PatchSchema);
  const { data, error } = await markNotificationRead(id, user.id, read ?? true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
});
