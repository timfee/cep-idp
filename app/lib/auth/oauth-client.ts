import { Token, WORKFLOW_CONSTANTS } from "../workflow";

export function validateScopes(
  token: Token,
  requiredScopes: string[],
): boolean {
  return requiredScopes.every((scope) => token.scope.includes(scope));
}

export function isTokenExpired(token: Token): boolean {
  return (
    Date.now() >= token.expiresAt - WORKFLOW_CONSTANTS.TOKEN_REFRESH_BUFFER_MS
  );
}

// Re-export from crypto (these are client-safe)
export {
  generateCodeChallenge,
  generateCodeVerifier,
  generateState,
} from "./crypto";
