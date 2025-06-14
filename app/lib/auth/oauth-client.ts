import { Token, WORKFLOW_CONSTANTS } from "../workflow";

/**
 * Check that a token grants all required OAuth scopes.
 *
 * @param token - Token with scope information
 * @param requiredScopes - Scopes required for an API call
 * @returns True if all required scopes are present
 */
export function validateScopes(
  token: Token,
  requiredScopes: string[]
): boolean {
  return requiredScopes.every((scope) => token.scope.includes(scope));
}

/**
 * Determine if the provided token is close to or past expiry.
 *
 * @param token - OAuth token to check
 * @returns Whether the token should be refreshed
 */
export function isTokenExpired(token: Token): boolean {
  return (
    Date.now() >= token.expiresAt - WORKFLOW_CONSTANTS.TOKEN_REFRESH_BUFFER_MS
  );
}

// Re-export from crypto (these are client-safe)
export {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState
} from "./crypto";
