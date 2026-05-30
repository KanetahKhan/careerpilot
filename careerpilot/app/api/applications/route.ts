import { z } from "zod";
import { NextResponse } from "next/server";
import {
  listApplications,
  createApplication,
  updateApplicationStatus,
} from "@/lib/services/tracker";
import { requireUser } from "@/lib/auth";
import { route, parseJson } from "@/lib/api";

export const runtime = "nodejs";

const STATUS = z.enum(["applied", "interviewing", "offer", "rejected"]);

const CreateSchema = z.object({
  role: z.string().min(1).max(300),
  company: z.string().min(1).max(300),
  location: z.string().max(300).nullish(),
  fit_score: z.number().int().min(0).max(100).nullish(),
  link: z.string().max(2000).nullish(),
  status: STATUS.optional(),
});

const PatchSchema = z.object({
  id: z.string().min(1),
  status: STATUS,
});

export const GET = route(async () => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { data, error } = await listApplications(user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ applications: data });
});

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const body = await parseJson(req, CreateSchema);
  const { data, error } = await createApplication(user.id, body);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
});

export const PATCH = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  const { id, status } = await parseJson(req, PatchSchema);
  const { data, error } = await updateApplicationStatus(id, user.id, status);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ application: data });
});
