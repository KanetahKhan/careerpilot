import { NextResponse } from "next/server";

/**
 * Liveness / healthcheck endpoint.
 *
 * Used by Docker (HEALTHCHECK), docker-compose, and any uptime monitor to verify
 * the app process is serving requests. Intentionally dependency-free: it does NOT
 * touch Supabase or Gemini, so it reports the *web tier's* health and never fails
 * because an external free-tier service is rate-limited. Deeper, dependency-aware
 * checks belong in a separate /api/health/ready route if ever needed.
 *
 * Returns: { status: "ok", time, uptime, version }
 */
export const runtime = "edge";
export const dynamic = "force-dynamic"; // never cache a healthcheck

export async function GET() {
  return NextResponse.json({
    status: "ok",
    time: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
