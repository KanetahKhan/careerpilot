import { NextRequest, NextResponse } from "next/server";
import { ingestCv } from "@/lib/services/profile";

export const runtime = "nodejs"; // pdf-parse/mammoth need Node, not edge
export const maxDuration = 60;

/** Thin controller: accept a file, delegate ingestion to the profile service. */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await ingestCv(buffer, file.name);
    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Upload failed" }, { status: 500 });
  }
}
