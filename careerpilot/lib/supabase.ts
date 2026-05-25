/**
 * Supabase client entry point.
 *
 * Re-exports helpers from the /supabase directory so every file in the
 * project can keep importing from "@/lib/supabase".
 *
 *   - createAdminClient()    — service-role client (bypasses RLS; server-only)
 *   - createClient()         — browser client (client components)
 *   - createServerClient()   — server client (route handlers, server actions)
 *
 * The DEMO_USER_ID constant has been removed — use the authenticated
 * user's id from the session instead.
 */

export { createAdminClient } from "./supabase/admin";
export { createClient as createBrowserClient } from "./supabase/client";
export { createClient as createServerClient } from "./supabase/server";
