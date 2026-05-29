import { z } from "zod";
import { NextResponse } from "next/server";
import { listEvents, createEvent, deleteEvent } from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";
import { route, parseJson, ApiError } from "@/lib/api";

export const runtime = "nodejs";

const CreateSchema = z.object({
  title: z.string().min(1).max(500),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "event_date must be YYYY-MM-DD"),
  type: z.enum(["deadline", "reminder", "custom"]).optional(),
  related_goal_id: z.string().nullish(),
  related_application_id: z.string().nullish(),
});

export const GET = route(async () => {
  const user = await requireUser();
  const { data, error } = await listEvents(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const body = await parseJson(req, CreateSchema);
  const { data, error } = await createEvent(user.id, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
});

export const DELETE = route(async (req: Request) => {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) throw new ApiError("id is required", 400);
  const { data, error } = await deleteEvent(id, user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
});
