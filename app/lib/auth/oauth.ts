import "server-only";

// Re-export everything from oauth-server
export * from "./oauth-server";
// Re-export client-safe functions
export { isTokenExpired, validateScopes } from "./oauth-client";
