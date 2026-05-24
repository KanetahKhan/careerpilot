import { NextRequest, NextResponse } from "next/server";
import {
  listApplications,
  createApplication,
  updateApplicationStatus,
} from "@/lib/services/tracker";

export const runtime = "nodejs";

export async function GET() {
  const { data, error } = await listApplications();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await createApplication(body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json();
  const { data, error } = await updateApplicationStatus(id, status);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
}
