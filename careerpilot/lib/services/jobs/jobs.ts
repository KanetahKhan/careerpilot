import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase";
import { SEED_JOBS } from "./seed-jobs";

export type Job = {
  id: string;
  role: string;
  company: string;
  location: string;
  salary: string | null;
  deadline: string | null;
  link: string | null;
  description: string;
};

function hash(query: string, location: string) {
  return crypto.createHash("sha1").update(`${query}::${location}`.toLowerCase()).digest("hex");
}

/** Map a raw JSearch result row to our Job shape. */
function mapJSearch(j: any): Job {
  return {
    id: j.job_id ?? crypto.randomUUID(),
    role: j.job_title ?? "Unknown role",
    company: j.employer_name ?? "Unknown company",
    location:
      [j.job_city, j.job_country].filter(Boolean).join(", ") ||
      (j.job_is_remote ? "Remote" : "—"),
    salary:
      j.job_min_salary && j.job_max_salary
        ? `${j.job_min_salary}–${j.job_max_salary} ${j.job_salary_currency ?? ""}`.trim()
        : null,
    deadline: j.job_offer_expiration_datetime_utc ?? null,
    link: j.job_apply_link ?? null,
    description: (j.job_description ?? "").slice(0, 4000),
  };
}

/**
 * Hunt jobs. Strategy that keeps you on the free tier:
 *   1. Check the Supabase cache (zero API cost on repeat queries — your demo).
 *   2. If RAPIDAPI_KEY is set, hit JSearch live, then cache the result.
 *   3. If no key (or the call fails), fall back to bundled SEED_JOBS so the
 *      demo always shows real, structured cards.
 */
export async function searchJobs(query: string, location = ""): Promise<Job[]> {
  const supabase = createAdminClient();
  const key = hash(query, location);

  // 1. cache — 24-hour TTL: ignore entries older than 24 h so live results refresh
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: cached } = await supabase
    .from("job_cache")
    .select("payload")
    .eq("query_hash", key)
    .gte("created_at", cutoff)
    .maybeSingle();
  if (cached?.payload) return cached.payload as Job[];

  // 2. live
  if (process.env.RAPIDAPI_KEY) {
    try {
      const url = new URL("https://jsearch.p.rapidapi.com/search");
      url.searchParams.set("query", `${query} ${location}`.trim());
      url.searchParams.set("num_pages", "1");
      const res = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": process.env.RAPIDAPI_KEY,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      if (res.ok) {
        const json = await res.json();
        const jobs: Job[] = (json.data ?? []).slice(0, 8).map(mapJSearch);
        if (jobs.length) {
          await supabase.from("job_cache").upsert({ query_hash: key, payload: jobs });
          return jobs;
        }
      }
    } catch {
      /* fall through to seed */
    }
  }

  // 3. seed fallback (filtered loosely by the query so it feels responsive)
  const q = query.toLowerCase();
  const filtered = SEED_JOBS.filter(
    (j) =>
      j.role.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      q.split(" ").some((w) => w.length > 3 && j.role.toLowerCase().includes(w))
  );
  return (filtered.length ? filtered : SEED_JOBS).slice(0, 6);
}
