export class ApiClientError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Client-side fetch helper: returns data or throws ApiClientError with the server's message and status. */
export async function callApi<T = unknown>(url: string, method: "GET" | "POST" | "PATCH" | "DELETE" = "POST", body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: { ok: boolean; data?: T; error?: string };
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError(`Request failed (${res.status}).`, res.status);
  }
  if (!res.ok || !json.ok) throw new ApiClientError(json.error || `Request failed (${res.status}).`, res.status);
  return json.data as T;
}

/** Path to the customer login that returns here afterwards. */
export function loginHref() {
  if (typeof window === "undefined") return "/login";
  return `/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`;
}
