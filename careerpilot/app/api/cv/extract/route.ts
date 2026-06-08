import { NextResponse } from "next/server";
import { extractProfileFromText } from "@/lib/services/profile";
import { requireUser } from "@/lib/auth";
import { route, ApiError } from "@/lib/api";

export const runtime = "nodejs";
export const maxDuration = 30;

export const POST = route(async (req: Request) => {
  const user = await requireUser();
  if (user instanceof Response) return user;

  let body: { text: string };
  try {
    body = await req.json();
  } catch {
    throw new ApiError("Invalid JSON body", 400);
  }

  const text = body?.text;
  if (!text || typeof text !== "string" || !text.trim()) {
    throw new ApiError("No CV text provided", 400);
  }

  const extracted = extractProfileFromText(text.slice(0, 30000));

  return NextResponse.json({ extracted, rawTextPreview: text.slice(0, 500) });
});
