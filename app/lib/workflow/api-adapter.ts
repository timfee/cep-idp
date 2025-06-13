import { Token } from "./types";
import { apiRequest as oldApiRequest } from "../api/client";
import { connections as newConnections } from "./config/connections";
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
   * @param connection Name of the configured connection (key from `connections`)
   * @param method     Standard HTTP verb (GET, POST, …)
   * @param url        Fully-resolved path (already interpolated by the caller)
   * @param options    Optional query string / body parameters
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
  variables: Record<string, string>
): ApiContext {
  return {
    request: async (connection, method, url, options) => {
      // -------------------------------------------------------------------
      // Translate the new connection configuration into the legacy shape
      // expected by the existing API client. The legacy client requires an
      // `auth` template string that is later populated with the access token.
      // -------------------------------------------------------------------
      const legacyConnections: Record<string, { base: string; auth: string }> =
        {};

      for (const [name, cfg] of Object.entries(newConnections)) {
        let authTemplate = "";
        const lower = name.toLowerCase();
        if (lower.includes("google")) {
          authTemplate = "Bearer {googleAccessToken}";
        } else if (lower.includes("graph")) {
          authTemplate = "Bearer {azureAccessToken}";
        }
        legacyConnections[name] = { base: cfg.base, auth: authTemplate };
      }
      const qsClean = options?.query
        ? (Object.fromEntries(
            Object.entries(options.query).filter(
              (entry): entry is [string, string] => typeof entry[1] === "string"
            )
          ) as Record<string, string>)
        : undefined;

      const endpoint = {
        conn: connection,
        method,
        path: url,
        qs: qsClean,
      } as const;

      return oldApiRequest({
        endpoint,
        connections: legacyConnections,
        variables,
        tokens,
        body: options?.body,
        throwOnMissingVars: true,
        onLog: (entry) => console.log(entry),
      });
    },
  };
}
