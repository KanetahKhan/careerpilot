import type { User } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/** The profile seeded by 0001_init.sql — the default identity for `npm run eval`. */
const SEEDED_EVAL_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Get the currently authenticated user in a server context
 * (API route, server action, server component).
 * Returns null if no session is present.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return user;

  // Dev/eval-only escape hatch: lets `npm run eval` exercise the authed routes
  // without a browser session. See eval/run.ts + SETUP.md §7.
  return getEvalUser();
}

/**
 * Variant that throws so the caller can skip the null check.
 */
export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

/**
 * Resolve a synthetic eval user, but ONLY when all of these hold:
 *   1. we are NOT in a production build (NODE_ENV !== "production"), and
 *   2. an EVAL_SECRET is configured server-side, and
 *   3. the request carries a matching `x-eval-secret` header.
 *
 * A normal browser never sends that header, so this can't affect real sessions;
 * the NODE_ENV guard means it is fully inert in production even if the env leaks.
 */
async function getEvalUser(): Promise<User | null> {
  if (process.env.NODE_ENV === "production") return null;
  const secret = process.env.EVAL_SECRET;
  if (!secret) return null;

  const h = await headers();
  if (h.get("x-eval-secret") !== secret) return null;

  const id = process.env.EVAL_USER_ID || SEEDED_EVAL_USER_ID;
  return { id } as unknown as User;
}
