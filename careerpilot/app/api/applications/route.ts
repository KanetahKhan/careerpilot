import { NextRequest, NextResponse } from "next/server";
import {
  listApplications,
  createApplication,
  updateApplicationStatus,
} from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await requireUser();
  const { data, error } = await listApplications(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
}

export async function POST(req: NextRequest) {
  const user = await requireUser();
  const body = await req.json();
  const { data, error } = await createApplication(user.id, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}

export async function PATCH(req: NextRequest) {
  const user = await requireUser();
  const { id, status } = await req.json();
  const { data, error } = await updateApplicationStatus(id, user.id, status);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
