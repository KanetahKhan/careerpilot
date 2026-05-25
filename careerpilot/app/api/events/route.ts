import { NextRequest, NextResponse } from "next/server";
import { listEvents, createEvent, deleteEvent } from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  const { data, error } = await listEvents(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ events: data });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  if (!body?.title?.trim() || !body?.event_date) {
    return NextResponse.json({ error: "title and event_date are required" }, { status: 400 });
  }
  const { data, error } = await createEvent(user.id, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}

export async function DELETE(req: NextRequest) {
  const user = await requireUser();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const { data, error } = await deleteEvent(id, user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ event: data });
}
