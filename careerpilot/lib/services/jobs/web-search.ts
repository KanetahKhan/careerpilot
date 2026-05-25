export type WebResult = {
  title: string;
  url: string;
  content: string;
};

/** True when a Tavily key is configured — otherwise the agent skips the tool. */
export function tavilyEnabled(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

/**
 * Web-search fallback for job leads via Tavily. Used when JSearch returns nothing
 * (quota exhausted / no matches), so the agent can still surface leads from the
 * open web. Results are less structured than JSearch (title, url, snippet).
 *
 * NEVER throws — returns [] when no key is configured or on any failure, so the
 * Job Hunter degrades gracefully (JSearch → seed, with web search as a bonus).
 */
export async function webSearchJobs(query: string, maxResults = 5): Promise<WebResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query: `${query} job openings apply`,
        max_results: maxResults,
        search_depth: "basic",
      }),
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results: any[] = Array.isArray(json?.results) ? json.results : [];
    return results
      .map((r) => ({
        title: String(r?.title ?? "Job lead"),
        url: String(r?.url ?? ""),
        content: String(r?.content ?? "").slice(0, 4000),
      }))
      .filter((r) => r.url);
  } catch {
    return [];
  }
}
