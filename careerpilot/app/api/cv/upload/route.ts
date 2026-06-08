import { NextResponse } from "next/server";
import { ingestCv } from "@/lib/services/profile";
import { requireUser } from "@/lib/auth";
import { route, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTS = new Set([".pdf", ".docx", ".txt"]);

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  await enforceRateLimit(user.id, "cv/upload", "heavy");
  const form = await (req as any).formData();
  const file = form.get("file") as File | null;
  if (!file) throw new ApiError("No file provided", 400);

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_EXTS.has(ext))
    throw new ApiError("Unsupported file type. Upload a PDF, DOCX, or TXT.", 415);
  if (file.size > MAX_FILE_BYTES)
    throw new ApiError("File too large — maximum 5 MB.", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await ingestCv(user.id, buffer, file.name);
  return NextResponse.json({ ok: true, ...result });
});
