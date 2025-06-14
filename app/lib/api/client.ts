import { isTokenExpired } from "../auth/oauth-client";
import { refreshAccessToken } from "../auth/oauth-server";
import { setToken } from "../auth/tokens";
import {
  Endpoint,
  LogEntry,
  substituteObject,
  substituteVariables,
  Token,
} from "../workflow";
import {
  CONNECTION_IDENTIFIERS,
  HTTP_METHODS_WITH_BODY,
  Provider,
  PROVIDERS,
  WORKFLOW_CONSTANTS,
} from "../workflow/constants";
import { ApiRequestOptions } from "./types";

import { connections } from "../workflow/config/connections";

/**
 * Simplified API request without template substitution.
 * Used by the new endpoint architecture.
 */
export async function makeApiRequest(options: {
  connection: string;
  method: string;
  path: string; // Already interpolated
  query?: Record<string, string | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
  tokens: { google?: Token; microsoft?: Token };
}): Promise<unknown> {
  const {
    connection: connName,
    method,
    path,
    query,
    body,
    headers = {},
    tokens,
  } = options;

  const connection = (connections as Record<string, { base: string; getAuthHeader: (t: { google?: Token; microsoft?: Token }) => string }>)[
    connName
  ];
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
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed: ${response.status} - ${errorText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

/**
 * Resolve which OAuth token should be used for a given endpoint.
 *
 * @param endpoint - Endpoint being invoked
 * @param tokens - Available OAuth tokens
 * @returns Selected token and its provider, if any
 */
function getTokenForConnection(
  endpoint: Endpoint,
  tokens: { google?: Token; microsoft?: Token },
  _onLog?: (entry: LogEntry) => void
): { token: Token | null; provider: Provider | null } {
  let token: Token | null = null;
  let provider: Provider | null = null;
  if (
    endpoint.conn.includes(CONNECTION_IDENTIFIERS.GOOGLE)
    || endpoint.conn.includes(CONNECTION_IDENTIFIERS.GOOGLE_CI)
  ) {
    token = tokens.google ?? null;
    provider = PROVIDERS.GOOGLE;
  } else if (endpoint.conn.includes(CONNECTION_IDENTIFIERS.MICROSOFT)) {
    token = tokens.microsoft ?? null;
    provider = PROVIDERS.MICROSOFT;
  }
  return { token, provider };
}

/**
 * Refresh an OAuth token when nearing expiry.
 *
 * @param token - Current token to check
 * @param provider - Provider associated with the token
 * @param onLog - Optional log handler
 * @returns The refreshed or original token
 */
async function refreshTokenIfNeeded(
  token: Token,
  provider: Provider,
  onLog?: (entry: LogEntry) => void
): Promise<Token> {
  if (!isTokenExpired(token) || !token.refreshToken) {
    return token;
  }

  let refreshAttempts = 0;
  while (refreshAttempts < WORKFLOW_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
    try {
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `Refreshing token for ${provider}, attempt ${refreshAttempts + 1}`,
      });
      const refreshedToken = await refreshAccessToken(
        provider,
        token.refreshToken
      );
      await setToken(provider, refreshedToken);
      return refreshedToken;
    } catch (error) {
      refreshAttempts++;
      onLog?.({
        timestamp: Date.now(),
        level: "error",
        message: `Token refresh attempt ${refreshAttempts} failed for ${provider}`,
        data: error,
      });
      if (refreshAttempts === WORKFLOW_CONSTANTS.MAX_REFRESH_ATTEMPTS) {
        throw new Error(
          `${PROVIDERS[provider.toUpperCase() as keyof typeof PROVIDERS]} authentication expired. Please re-authenticate.`
        );
      }
    }
  }
  return token;
}

/**
 * Assemble headers and body for an authenticated request.
 *
 * @param connection - Connection details containing auth template
 * @param endpoint - Endpoint information
 * @param token - Token used for the request
 * @param body - Optional request payload
 * @returns Fully formed fetch options
 */
function buildAuthenticatedRequest(
  connection: { auth: string },
  endpoint: Endpoint,
  token: Token,
  body: unknown
): RequestInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const authHeader = connection.auth
    .replace("{googleAccessToken}", token.accessToken)
    .replace("{azureAccessToken}", token.accessToken);
  headers["Authorization"] = authHeader;

  const requestOptions: RequestInit = { method: endpoint.method, headers };
  if (
    body
    && HTTP_METHODS_WITH_BODY.includes(
      endpoint.method as (typeof HTTP_METHODS_WITH_BODY)[number]
    )
  ) {
    requestOptions.body = JSON.stringify(body);
  }
  return requestOptions;
}

/**
 * Execute a request against an unauthenticated endpoint.
 *
 * @param options - Request configuration
 * @returns API response data and any captured variables
 */
async function handlePublicRequest(
  options: ApiRequestOptions
): Promise<{ data: unknown; capturedValues: Record<string, string> }> {
  const {
    endpoint,
    connections,
    variables,
    throwOnMissingVars = true,
  } = options;
  const connection = connections[endpoint.conn];
  const capturedValues: Record<string, string> = {};
  const path = substituteVariables(endpoint.path, variables, {
    throwOnMissing: throwOnMissingVars,
    captureGenerated: capturedValues,
  });
  let url = `${connection.base}${path}`;

  if (endpoint.qs) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(endpoint.qs)) {
      params.append(
        key,
        substituteVariables(value, variables, {
          throwOnMissing: throwOnMissingVars,
          captureGenerated: capturedValues,
        })
      );
    }
    url += `?${params.toString()}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Request failed: ${response.status} - ${response.statusText}`
    );
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("xml")) {
    return { data: await response.text(), capturedValues };
  }
  return { data: await response.json(), capturedValues };
}

/**
 * Perform an authenticated API request using the appropriate token.
 *
 * @param options - Request configuration including tokens
 * @returns API response data and any captured variables
 */
async function handleAuthenticatedRequest(
  options: ApiRequestOptions
): Promise<{ data: unknown; capturedValues: Record<string, string> }> {
  const {
    endpoint,
    connections,
    variables,
    tokens,
    body,
    throwOnMissingVars = true,
    onLog,
  } = options;
  const connection = connections[endpoint.conn];
  const capturedValues: Record<string, string> = {};

  const { token: initialToken, provider } = getTokenForConnection(
    endpoint,
    tokens,
    onLog
  );

  if (!initialToken || !provider) {
    throw new Error(`No token available for connection: ${endpoint.conn}`);
  }

  const token = await refreshTokenIfNeeded(initialToken, provider, onLog);

  const path = substituteVariables(endpoint.path, variables, {
    throwOnMissing: throwOnMissingVars,
  });
  let url = `${connection.base}${path}`;

  if (endpoint.qs) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(endpoint.qs)) {
      params.append(key, substituteVariables(value, variables));
    }
    url += `?${params.toString()}`;
  }

  const finalBody =
    body ?
      substituteObject(body, variables, {
        throwOnMissing: throwOnMissingVars,
        captureGenerated: capturedValues,
      })
    : undefined;

  const requestOptions = buildAuthenticatedRequest(
    connection,
    endpoint,
    token,
    finalBody
  );

  const response = await fetch(url, requestOptions);

  if (response.status === WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED) {
    throw new Error(`Authentication failed: Token may be expired or invalid`);
  }

  if (
    response.status === WORKFLOW_CONSTANTS.HTTP_STATUS.NOT_FOUND
    && !throwOnMissingVars
  ) {
    return { data: null, capturedValues };
  }

  if (!response.ok) {
    const error = await response.text();

    throw new Error(
      `${endpoint.conn} API request to ${endpoint.method} ${endpoint.path} failed: ${response.status}: ${error}`
    );
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return { data: await response.json(), capturedValues };
  }

  return { data: await response.text(), capturedValues };
}

/**
 * Dispatch a workflow API request, falling back to unauthenticated mode if
 * the selected connection does not require authentication.
 *
 * @param options - Request configuration
 * @returns API response payload and captured variables
 */
/**
 * @deprecated Use makeApiRequest for new code paths.  This function remains
 *             only to support the legacy JSON-based workflow engine during
 *             the migration period.
 */
export async function apiRequest(
  options: ApiRequestOptions
): Promise<{ data: unknown; capturedValues: Record<string, string> }> {
  const { endpoint, connections } = options;
  const connection = connections[endpoint.conn];
  if (!connection) {
    throw new Error(`Connection not found: ${endpoint.conn}`);
  }
  if (connection.auth === "none") {
    return handlePublicRequest(options);
  }
  return handleAuthenticatedRequest(options);
}
