import { createAdminClient } from "@/lib/supabase";
import { ApiError } from "@/lib/api";

/**
 * Per-user sliding-window rate limiter backed by Supabase.
 *
 * Two tiers (per minute per user per endpoint):
 *   heavy  — 5 req/min  multi-step agent loops + batch embedding
 *                        (jobs/search, cv/upload, cv/build, roadmap)
 *   medium — 20 req/min single LLM calls
 *                        (chat, fit, interview, skill-gap, apply, etc.)
 *
 * The check is atomic: the Postgres RPC acquires a pg_advisory_xact_lock
 * on (user_id, endpoint) before doing the count+insert, so concurrent
 * serverless instances from the same user cannot both slip past the limit.
 *
 * Fails open on DB error — a Supabase blip must never break features.
 */

const TIERS = {
  heavy:  { window: 60, max: 5  },
  medium: { window: 60, max: 20 },
} as const;

type Tier = keyof typeof TIERS;

export async function enforceRateLimit(
  userId: string,
  endpoint: string,
  tier: Tier = "medium",
): Promise<void> {
  const { window, max } = TIERS[tier];
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase.rpc("check_and_record_rate_limit", {
      p_user_id: userId,
      p_endpoint: endpoint,
      p_window_seconds: window,
      p_max_requests: max,
    });
    if (error) {
      console.warn("[rate-limit] DB check failed, failing open:", error.message);
      return;
    }
    if (data === false) {
      throw new ApiError(
        `Rate limit: max ${max} requests per ${window}s on this endpoint. Please wait a moment.`,
        429,
      );
    }
  } catch (e) {
    if (e instanceof ApiError) throw e; // re-throw the 429
    console.warn("[rate-limit] unexpected error, failing open:", e);
  }
}
