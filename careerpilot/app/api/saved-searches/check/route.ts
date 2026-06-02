import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase";
import { searchJobs } from "@/lib/services/jobs";
import { insertNotifications } from "@/lib/services/tracker";
import crypto from "crypto";
import { getErrorMessage } from "@/lib/errors";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Stable fingerprint for a job (role + company + location), data-source agnostic. */
function jobKey(j: { role: string; company: string; location: string }): string {
  return crypto
    .createHash("sha1")
    .update(`${j.role}::${j.company}::${j.location}`.toLowerCase())
    .digest("hex");
}

type CheckResult = {
  searchId: number;
  label: string;
  query: string;
  location: string;
  newMatches: number;
  nudgeCreated: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    if (user instanceof Response) return user;
    const searchId = req.nextUrl.searchParams.get("id");
    const supabase = createAdminClient();

    // Resolve which searches to check — either a single ?id= or all user's saved
    let searches: any[];
    if (searchId) {
      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("id", searchId)
        .eq("user_id", user.id)
        .maybeSingle();
      searches = data ? [data] : [];
      if (!searches.length) {
        return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
      }
    } else {
      const { data } = await supabase
        .from("saved_searches")
        .select("*")
        .eq("user_id", user.id);
      searches = data ?? [];
    }

    const results: CheckResult[] = [];

    for (const search of searches) {
      try {
      // Rate-limit: at most once per hour per search
      if (search.last_run_at) {
        const elapsed = Date.now() - new Date(search.last_run_at).getTime();
        if (elapsed < 3_600_000) {
          results.push({
            searchId: search.id,
            label: search.label,
            query: search.query,
            location: search.location,
            newMatches: 0,
            nudgeCreated: false,
          });
          continue;
        }
      }

      const jobs = await searchJobs(search.query, search.location);
      const seenSet = new Set<string>(search.seen_job_keys ?? []);
      const newKeys = jobs.map(jobKey).filter((k: string) => !seenSet.has(k));

      let nudgeCreated = false;
      if (newKeys.length > 0) {
        // Create a nudge so the user sees new-match alerts in the tracker
        const label = search.label || search.query;
        const noun = newKeys.length === 1 ? "new match" : "new matches";
        const nudgeLabel = `${newKeys.length} ${noun} for "${label}"`;
        const inserted = await insertNotifications(user.id, [
          {
            message: nudgeLabel,
            type: "apply",
            action: { type: "hunter_search" as const, query: search.query },
          },
        ]);
        nudgeCreated = !inserted.error;

        // Update seen keys and last_run_at
        const updatedKeys = [...seenSet, ...newKeys];
        await supabase
          .from("saved_searches")
          .update({
            seen_job_keys: updatedKeys,
            last_run_at: new Date().toISOString(),
          })
          .eq("id", search.id);
      } else {
        // Still update last_run_at so the rate-limit clock resets
        await supabase
          .from("saved_searches")
          .update({ last_run_at: new Date().toISOString() })
          .eq("id", search.id);
      }

      results.push({
        searchId: search.id,
        label: search.label,
        query: search.query,
        location: search.location,
        newMatches: newKeys.length,
        nudgeCreated,
      });
    } catch {
      // Never throw on a single search failure — continue to the next
      results.push({
        searchId: search.id,
        label: search.label,
        query: search.query,
        location: search.location,
        newMatches: 0,
        nudgeCreated: false,
      });
    }
  }

    return NextResponse.json({ checked: results.length, results });
  } catch (e: unknown) {
    return NextResponse.json({ error: getErrorMessage(e) }, { status: 500 });
  }
}
