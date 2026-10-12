/**
 * Defensive JSON reader for fetch() responses. Returns null (never throws) when the body is not JSON - for example an
 * HTML error page from a proxy, a redirect target, or an empty 5xx - so callers can show a Hebrew error instead of
 * crashing with "Unexpected token '<' ... is not valid JSON".
 */
export async function readJsonResponse<T = Record<string, unknown>>(response: Response): Promise<T | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  return (await response.json().catch(() => null)) as T | null;
}
