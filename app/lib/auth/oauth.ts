import "server-only";

export * from "./oauth-server";

// Re-export client-safe functions
export { isTokenExpired, validateScopes } from "./oauth-client";
