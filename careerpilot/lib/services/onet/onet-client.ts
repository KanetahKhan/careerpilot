/**
 * O*NET Web Services client — services.onetcenter.org
 *
 * Authoritative US-DoL occupational taxonomy. We use it as the primary source
 * for role-benchmark skill lists, ahead of the per-request LLM fallback.
 *
 * Auth: X-API-Key header. If ONET_API_KEY is unset, every function returns
 * null — the calling tier (benchmarks.ts) falls through to the LLM cleanly.
 */

const ONET_BASE = "https://services.onetcenter.org/ws";
const TIMEOUT_MS = 5000;
const RELEVANCE_THRESHOLD = 50;      // O*NET search relevance_score (0–100)
const IMPORTANCE_THRESHOLD = 3.0;    // O*NET IM scale (1–5) — keep what employers expect
const MAX_SKILLS = 15;               // matches the current 10–15 invariant in benchmarks.ts

export type OnetMatch = { soc: string; title: string; relevance: number };

function authHeaders(): Record<string, string> | null {
  const key = process.env.ONET_API_KEY;
  if (!key) return null;
  return {
    "X-API-Key": key,
    Accept: "application/json",
    "User-Agent": "CareerPilot/1.0 (https://github.com/)",
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  const headers = authHeaders();
  if (!headers) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function searchOccupation(keyword: string): Promise<OnetMatch | null> {
  const q = encodeURIComponent(keyword.trim());
  if (!q) return null;
  type SearchRes = {
    occupation?: Array<{ code?: string; title?: string; relevance_score?: number }>;
  };
  const data = await fetchJson<SearchRes>(`${ONET_BASE}/online/search?keyword=${q}`);
  const top = data?.occupation?.[0];
  if (!top?.code || !top?.title || typeof top.relevance_score !== "number") return null;
  if (top.relevance_score < RELEVANCE_THRESHOLD) return null;
  return { soc: top.code, title: top.title, relevance: top.relevance_score };
}

type Element = { name?: string; score?: { value?: number; scale?: string } };
type ElementList = { element?: Element[] };

function extractImportant(list: ElementList | null): string[] {
  if (!list?.element) return [];
  return list.element
    .filter((e) => {
      const value = e.score?.value;
      const scale = e.score?.scale;
      if (typeof value !== "number") return false;
      // Summary endpoints default to importance ("IM"); accept missing scale defensively.
      if (scale && scale !== "IM") return false;
      return value >= IMPORTANCE_THRESHOLD;
    })
    .map((e) => (e.name ?? "").trim())
    .filter(Boolean);
}

type TechRes = {
  category?: Array<{
    example?: Array<{ name?: string; hot_technology?: boolean }>;
  }>;
};

function extractTech(data: TechRes | null): string[] {
  if (!data?.category) return [];
  const hot: string[] = [];
  const rest: string[] = [];
  for (const cat of data.category) {
    for (const ex of cat.example ?? []) {
      const name = (ex.name ?? "").trim();
      if (!name) continue;
      if (ex.hot_technology) hot.push(name);
      else rest.push(name);
    }
  }
  // Prefer hot technologies; backfill with non-hot up to a soft cap of 8.
  return [...hot, ...rest.slice(0, Math.max(0, 8 - hot.length))];
}

export async function fetchOccupationSkills(soc: string): Promise<string[]> {
  const [skills, knowledge, tech] = await Promise.all([
    fetchJson<ElementList>(`${ONET_BASE}/online/occupations/${soc}/summary/skills`),
    fetchJson<ElementList>(`${ONET_BASE}/online/occupations/${soc}/summary/knowledge`),
    fetchJson<TechRes>(`${ONET_BASE}/online/occupations/${soc}/summary/technology_skills`),
  ]);
  const merged = [
    ...extractImportant(skills),
    ...extractImportant(knowledge),
    ...extractTech(tech),
  ];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of merged) {
    const v = raw.toLowerCase().trim();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length >= MAX_SKILLS) break;
  }
  return out;
}

export async function getOnetBenchmark(
  role: string,
): Promise<{ roleTitle: string; soc: string; skills: string[] } | null> {
  const match = await searchOccupation(role);
  if (!match) return null;
  const skills = await fetchOccupationSkills(match.soc);
  if (skills.length === 0) return null;
  return { roleTitle: match.title, soc: match.soc, skills };
}
