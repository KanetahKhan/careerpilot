import { NextResponse } from "next/server";
import { getCvProfile } from "@/lib/services/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Thin controller: return the user's parsed CV grouped by section. */
export async function GET() {
  try {
    const profile = await getCvProfile();
    return NextResponse.json(profile);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Failed to load profile" }, { status: 500 });
  }
}
