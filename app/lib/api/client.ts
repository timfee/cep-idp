import { isTokenExpired, refreshAccessToken } from "../auth/oauth";
import { setToken } from "../auth/tokens";
import { substituteVariables, substituteObject, Token } from "../workflow";
import { WORKFLOW_CONSTANTS } from "../workflow/constants";
import { ApiRequestOptions } from "./types";

async function handlePublicRequest(options: ApiRequestOptions): Promise<unknown> {
  const { endpoint, connections, variables, throwOnMissingVars = true } = options;
  const connection = connections[endpoint.conn as keyof typeof connections];
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
        }),
      );
    }
    url += `?${params.toString()}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} - ${response.statusText}`);
  }
  const contentType = response.headers.get("content-type");
  if (contentType?.includes("xml")) {
    return { data: await response.text(), capturedValues };
  }
  return { data: await response.json(), capturedValues };
}

async function handleAuthenticatedRequest(options: ApiRequestOptions): Promise<unknown> {
  const { endpoint, connections, variables, tokens, body, throwOnMissingVars = true } = options;
  const connection = connections[endpoint.conn as keyof typeof connections];

  let token: Token | null = null;
  let provider: "google" | "microsoft" | null = null;

  if (endpoint.conn.includes("google") || endpoint.conn.includes("CI")) {
    token = tokens.google;
    provider = "google";
  } else if (endpoint.conn.includes("graph")) {
    token = tokens.microsoft;
    provider = "microsoft";
  }

  if (!token) {
    throw new Error(`No token available for connection: ${endpoint.conn}`);
  }

  // Check and refresh token if needed
  if (isTokenExpired(token) && token.refreshToken && provider) {
    try {
      console.log(
        `[API Client] Token expired for ${provider}, attempting refresh...`,
      );
      const refreshedToken = await refreshAccessToken(
        provider,
        token.refreshToken,
      );

      // CRITICAL: Persist the refreshed token
      await setToken(provider, refreshedToken);

      // Use the refreshed token for this request
      token = refreshedToken;

      console.log(`[API Client] Token refreshed successfully for ${provider}`);
    } catch (refreshError) {
      console.error(
        `[API Client] Token refresh failed for ${provider}:`,
        refreshError,
      );
      const errorMessage =
        refreshError instanceof Error ? refreshError.message : "Unknown error";
      throw new Error(
        `Authentication expired for ${provider}. ${errorMessage}. Please re-authenticate manually.`,
      );
    }
  }

  const path = substituteVariables(endpoint.path, variables, { throwOnMissing: throwOnMissingVars });
  let url = `${connection.base}${path}`;

  if (endpoint.qs) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(endpoint.qs)) {
      params.append(key, substituteVariables(value, variables));
    }
    url += `?${params.toString()}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const authHeader = connection.auth
    .replace("{googleAccessToken}", token.accessToken)
    .replace("{azureAccessToken}", token.accessToken);
  headers["Authorization"] = authHeader;

  const requestOptions: RequestInit = {
    method: endpoint.method,
    headers,
  };

  const finalBody = body
    ? substituteObject(body, variables, {
        throwOnMissing: throwOnMissingVars,
        captureGenerated: capturedValues,
      })
    : undefined;

  if (finalBody && ["POST", "PATCH", "PUT"].includes(endpoint.method)) {
    requestOptions.body = JSON.stringify(finalBody);
  }

  const response = await fetch(url, requestOptions);

  if (response.status === WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED) {
    throw new Error(`Authentication failed: Token may be expired or invalid`);
  }

  if (response.status === WORKFLOW_CONSTANTS.HTTP_STATUS.NOT_FOUND && !throwOnMissingVars) {
    return null;
  }

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API request failed: ${response.status} - ${error}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType?.includes("application/json")) {
    return { data: await response.json(), capturedValues };
  }

  return { data: await response.text(), capturedValues };
}

export async function apiRequest(
  options: ApiRequestOptions,
): Promise<{ data: unknown; capturedValues: Record<string, string> }> {
  const { endpoint, connections } = options;
  const connection = connections[endpoint.conn as keyof typeof connections];
  if (!connection) {
    throw new Error(`Connection not found: ${endpoint.conn}`);
  }
  if (connection.auth === "none") {
    return handlePublicRequest(options);
  }
  return handleAuthenticatedRequest(options);
}
