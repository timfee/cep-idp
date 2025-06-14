import { Token } from "./types";
import { makeApiRequest } from "../api/client";
import { HttpMethod } from "./constants";

/**
 * Lightweight runtime context used by endpoint wrappers to interact with the
 * existing (JSON-template based) HTTP client while we migrate to the new
 * typed architecture.
 */
export interface ApiContext {
  /**
   * Issue an HTTP request through the legacy apiRequest helper.
   *
   * @param connection - Name of the configured connection (key from `connections`).
   * @param method - Standard HTTP verb (GET, POST, …).
   * @param url - Fully-resolved path (already interpolated by the caller).
   * @param options - Optional query string / body parameters.
   */
  request: (
    connection: string,
    method: HttpMethod,
    url: string,
    options?: { query?: Record<string, string | undefined>; body?: unknown }
  ) => Promise<unknown>;
}

/**
 * Build an ApiContext instance bound to the supplied OAuth tokens and runtime
 * variable map. The context simply forwards calls to the legacy JSON workflow
 * client so existing behaviour remains unchanged during the refactor.
 */
export function createApiContext(
  tokens: { google?: Token; microsoft?: Token },
  _variables: Record<string, string>
): ApiContext {
  return {
    request: async (connection, method, url, options) => {
      // -------------------------------------------------------------------
      // Translate the new connection configuration into the legacy shape
      // expected by the existing API client. The legacy client requires an
      // `auth` template string that is later populated with the access token.
      // -------------------------------------------------------------------
      const qsClean = options?.query
        ? (Object.fromEntries(
            Object.entries(options.query).filter((e): e is [string, string] =>
              typeof e[1] === "string"
            )
          ) as Record<string, string>)
        : undefined;

      return makeApiRequest({
        connection,
        method,
        path: url,
        query: qsClean,
        body: options?.body,
        headers: {},
        tokens,
      });
    },
  };
}
