import v8 from "v8";
import { NextResponse } from "next/server";
import { ingestCv } from "@/lib/services/profile";
import { requireUser } from "@/lib/auth";
import { route, ApiError } from "@/lib/api";
import { enforceRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTS = new Set([".pdf", ".docx", ".txt"]);

function logMem(label: string) {
  const heap = v8.getHeapStatistics();
  console.log(
    `[MEMORY ${label}] Used: ${(heap.used_heap_size / 1024 / 1024).toFixed(1)}MB ` +
    `/ Total: ${(heap.total_heap_size / 1024 / 1024).toFixed(1)}MB ` +
    `/ Heap limit: ${(heap.heap_size_limit / 1024 / 1024).toFixed(0)}MB`
  );
}

function gcIfAvailable() {
  if (typeof globalThis.gc === "function") {
    globalThis.gc();
  }
}

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;
  await enforceRateLimit(user.id, "cv/upload", "heavy");
  logMem("START");

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError("Invalid form data", 400);
  }
  const file = form.get("file") as File | null;
  if (!file || !file.name) throw new ApiError("No file provided", 400);

  const ext = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  if (!ALLOWED_EXTS.has(ext))
    throw new ApiError("Unsupported file type. Upload a PDF, DOCX, or TXT.", 415);
  if (file.size > MAX_FILE_BYTES)
    throw new ApiError("File too large — maximum 5 MB.", 413);

  const buffer = Buffer.from(await file.arrayBuffer());
  logMem("BEFORE_INGEST");

  const result = await ingestCv(user.id, buffer, file.name);
  gcIfAvailable();
  logMem("END");

  return NextResponse.json({ ok: true, ...result });
});
