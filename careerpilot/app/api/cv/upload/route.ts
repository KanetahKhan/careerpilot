import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, DEMO_USER_ID } from "@/lib/supabase";
import { extractText, chunkCv } from "@/lib/cv";
import { embedBatch } from "@/lib/ai";

export const runtime = "nodejs"; // pdf-parse/mammoth need Node, not edge
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const text = await extractText(buffer, file.name);
    if (!text.trim()) {
      return NextResponse.json({ error: "Could not extract text from file" }, { status: 422 });
    }

    const chunks = chunkCv(text);
    const embeddings = await embedBatch(chunks.map((c) => c.content));

    const supabase = supabaseAdmin();

    // fresh upload → clear this user's old CV data (demo simplicity)
    await supabase.from("cv_chunks").delete().eq("user_id", DEMO_USER_ID);
    await supabase.from("cv_documents").delete().eq("user_id", DEMO_USER_ID);

    const { data: doc, error: docErr } = await supabase
      .from("cv_documents")
      .insert({ user_id: DEMO_USER_ID, file_name: file.name, raw_text: text })
      .select("id")
      .single();
    if (docErr) throw docErr;

    const rows = chunks.map((c, i) => ({
      user_id: DEMO_USER_ID,
      document_id: doc.id,
      section: c.section,
      content: c.content,
      position: c.position,
      embedding: embeddings[i],
    }));
    const { error: insErr } = await supabase.from("cv_chunks").insert(rows);
    if (insErr) throw insErr;

    const sections = [...new Set(chunks.map((c) => c.section))];
    return NextResponse.json({
      ok: true,
      fileName: file.name,
      chunks: chunks.length,
      sections,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Upload failed" },
      { status: 500 }
    );
  }
}
