import { Connection, Endpoint, Token } from '../workflow/types';
import { substituteVariables } from '../workflow/variables';
import { isTokenExpired, refreshAccessToken } from '../auth/oauth';

class ApiClient {
  async request(
    endpoint: Endpoint,
    connections: Record<string, Connection>,
    variables: Record<string, string>,
    tokens: { google?: Token; microsoft?: Token },
    body?: unknown
  ): Promise<unknown> {
    const connection = connections[endpoint.conn];
    if (!connection) {
      throw new Error(`Connection not found: ${endpoint.conn}`);
    }

    // Determine which token to use
    let token = null;
    let provider: 'google' | 'microsoft' | null = null;

    if (endpoint.conn.includes('google') || endpoint.conn.includes('CI')) {
      token = tokens.google;
      provider = 'google';
    } else if (endpoint.conn.includes('graph')) {
      token = tokens.microsoft;
      provider = 'microsoft';
    }

    if (!token) {
      throw new Error(`No token available for connection: ${endpoint.conn}`);
    }

    // Check and refresh token if needed
    if (isTokenExpired(token) && token.refreshToken && provider) {
      token = await refreshAccessToken(provider, token.refreshToken);
      // Update token in state (this would be handled by the caller)
    }

    // Build URL
    const path = substituteVariables(endpoint.path, variables);
    let url = `${connection.base}${path}`;

    // Add query parameters
    if (endpoint.qs) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(endpoint.qs)) {
        params.append(key, substituteVariables(value, variables));
      }
      url += `?${params.toString()}`;
    }

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add authorization
    const authHeader = connection.auth.replace('{googleAccessToken}', token.accessToken)
                                     .replace('{azureAccessToken}', token.accessToken);
    headers['Authorization'] = authHeader;

    // Make request
    const options: RequestInit = {
      method: endpoint.method,
      headers,
    };

    if (body && ['POST', 'PATCH', 'PUT'].includes(endpoint.method)) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API request failed: ${response.status} - ${error}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return response.json();
    }

    return response.text();
  }
}

export const apiClient = new ApiClient();
