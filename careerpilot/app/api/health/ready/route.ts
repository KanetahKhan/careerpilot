import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Readiness probe — verifies the web tier can reach Supabase.
 * Returns 200 { status: "ok" } when healthy, 503 { status: "degraded", detail }
 * when Supabase is unreachable. Distinct from /api/health, which is dependency-free.
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("profiles").select("id").limit(0);
    if (error) throw error;
    return NextResponse.json({ status: "ok" });
  } catch (e: any) {
    return NextResponse.json(
      { status: "degraded", detail: e?.message ?? "Supabase unreachable" },
      { status: 503 },
    );
  }
}
