import { NextResponse } from "next/server";
import { isLLMEnabled, isEmbeddingEnabled } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    llmEnabled: isLLMEnabled(),
    embeddingEnabled: isEmbeddingEnabled(),
    timestamp: new Date().toISOString(),
  });
}
