import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Get the currently authenticated user in a server context
 * (API route, server action, server component).
 * Returns null if no session is present.
 */
export async function getAuthenticatedUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the authenticated user or return a 401 Response.
 * Every API route should call this and check:
 *   const user = await requireUser();
 *   if (user instanceof Response) return user;
 */
export async function requireUser(): Promise<User | Response> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}
