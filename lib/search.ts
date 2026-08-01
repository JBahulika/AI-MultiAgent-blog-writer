export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchFn = (query: string, maxResults?: number) => Promise<SearchResult[]>;

/** No-op search used when TAVILY_API_KEY is unset — research falls back to the PRD only. */
export async function noopSearch(_query: string, _maxResults = 5): Promise<SearchResult[]> {
  return [];
}

export function isTavilyConfigured(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

/**
 * Prefer Tavily when configured; otherwise return empty results so the pipeline still runs.
 */
export function getSearchFn(): SearchFn {
  return isTavilyConfigured() ? tavilySearch : noopSearch;
}

/**
 * Tavily web search. Requires TAVILY_API_KEY.
 */
export async function tavilySearch(
  query: string,
  maxResults = 5
): Promise<SearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return noopSearch(query, maxResults);
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "basic",
      include_answer: false,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Tavily search failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  return (data.results || [])
    .filter((r) => r.title && r.url)
    .map((r) => ({
      title: r.title!,
      url: r.url!,
      snippet: (r.content || "").slice(0, 500),
    }));
}
