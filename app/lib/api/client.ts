import { connections } from "@/app/lib/workflow/config/connections";
import { Token } from "@/app/lib/workflow/types";

/**
 * Lightweight API request helper used by the new typed step handlers.
 */
export async function makeApiRequest<T = unknown>(options: {
  connection: string;
  method: string;
  path: string; // Already interpolated / substituted
  query?: Record<string, string | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  tokens: { google?: Token; microsoft?: Token };
}): Promise<T> {
  const {
    connection: connName,
    method,
    path,
    query,
    body,
    headers = {},
    tokens
  } = options;

  const connection = (
    connections as Record<
      string,
      {
        base: string;
        getAuthHeader: (t: { google?: Token; microsoft?: Token }) => string;
      }
    >
  )[connName];

  if (!connection) {
    throw new Error(`Unknown connection: ${connName}`);
  }

  const url = new URL(path, connection.base);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, value);
      }
    });
  }

  const authHeader = connection.getAuthHeader(tokens);
  if (authHeader) {
    headers["Authorization"] = authHeader;
  }

  if (!headers["Content-Type"] && body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json() as Promise<T>;
  }

  return response.text() as Promise<T>;
}
