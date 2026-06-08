import type { User } from "@supabase/supabase-js";
import { headers as nextHeaders } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase";

type AuthUser = Pick<User, "id">;

async function getHeader(req: Request | undefined, name: string): Promise<string | null> {
  if (req) return req.headers.get(name);
  try {
    const h = await nextHeaders();
    return h.get(name);
  } catch {
    return null;
  }
}

export async function getEvalUser(req?: Request): Promise<AuthUser | null> {
  if (process.env.NODE_ENV === "production") return null;
  if (process.env.ENABLE_EVAL !== "1") return null;
  const secret = process.env.EVAL_SECRET;
  if (!secret) return null;
  const header = await getHeader(req, "x-eval-secret");
  if (!header || header !== secret) return null;

  const supabase = createAdminClient();
  const evalUserId = process.env.DEMO_USER_ID || "00000000-0000-0000-0000-000000000001";

  // Validate the user exists in the profiles table (seeded by migration 0001).
  // If the row is missing (fresh DB), still return the user object so eval
  // works before migrations run — the eval secret IS the auth in dev mode.
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", evalUserId)
    .maybeSingle();

  if (error) {
    console.warn(`[Auth] DB check failed for eval user: ${error.message}`);
  }
  if (!error && !data?.id) {
    // Profile row missing — upsert it so the rest of the system works.
    const { error: upsertErr } = await supabase
      .from("profiles")
      .upsert({ id: evalUserId, full_name: "Eval User" });
    if (upsertErr) {
      console.warn(`[Auth] Failed to upsert eval profile: ${upsertErr.message}`);
    }
  }

  return { id: evalUserId };
}

/**
 * Get the currently authenticated user in a server context
 * (API route, server action, server component).
 * Returns null if no session is present.
 */
export async function getAuthenticatedUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.user ?? null;
}

/**
 * Get the authenticated user or return a 401 Response.
 * Every API route should call this and check:
 *   const user = await requireUser();
 *   if (user instanceof Response) return user;
 */
export async function requireUser(req?: Request): Promise<AuthUser | Response> {
  const user = await getAuthenticatedUser();
  if (user) return user;
  const evalUser = await getEvalUser(req);
  if (evalUser) return evalUser;
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
