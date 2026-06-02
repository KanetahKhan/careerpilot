import { NextRequest, NextResponse } from "next/server";
import { extractText, chunkCv, ingestSections } from "@/lib/services/profile";
import { AI_BUSY_MESSAGE, isRateLimitError } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const MAX_PAGES_ESTIMATE = 3;
const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXTS = [".pdf", ".docx", ".txt"];

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large (${Math.round(file.size / 1024 / 1024)} MB). Max 2 MB. Try a shorter CV or compress images.` },
        { status: 413 }
      );
    }
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported file type "${file.type}". Use PDF, DOCX, or TXT.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name);
    if (!text.trim()) throw new Error("Could not extract text from file");

    const estimatedPages = Math.ceil(text.length / 3000);
    if (estimatedPages > MAX_PAGES_ESTIMATE) {
      return NextResponse.json(
        { error: `CV appears to be ${estimatedPages} pages. Max 3 pages for demo. Try a shorter CV.` },
        { status: 413 }
      );
    }

    const rawChunks = chunkCv(text);
    const sectionMap = new Map<string, string[]>();
    for (const c of rawChunks) {
      const arr = sectionMap.get(c.section) ?? [];
      arr.push(c.content);
      sectionMap.set(c.section, arr);
    }
    const sections = [...sectionMap.entries()].map(([section, contents]) => ({
      section,
      content: contents.join("\n\n"),
    }));

    const result = await ingestSections(user.id, sections, file.name);
    return NextResponse.json({ ok: true, ...result, rawText: text.slice(0, 12000) });
  } catch (e: unknown) {
    if (isRateLimitError(e)) {
      return NextResponse.json({ error: AI_BUSY_MESSAGE }, { status: 429 });
    }
    const msg = getErrorMessage(e);
    if (/heap|memory|out of memory/i.test(msg)) {
      return NextResponse.json(
        { error: "Server ran out of memory. Try a shorter CV (max 2 MB, ~3 pages)." },
        { status: 413 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
