import { NextResponse } from "next/server";
import { ingestCv } from "@/lib/services/profile";
import { requireUser } from "@/lib/auth";
import { route, ApiError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  const form = await (req as any).formData();
  const file = form.get("file") as File | null;
  if (!file) throw new ApiError("No file provided", 400);

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ingestCv(user.id, buffer, file.name);
  return NextResponse.json({ ok: true, ...result });
});
