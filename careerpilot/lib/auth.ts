import { createClient } from "@/lib/supabase/server";

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
  return user;
}

/**
 * Variant that throws so the caller can skip the null check.
 */
export async function requireUser() {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
