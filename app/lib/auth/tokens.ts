import { cookies } from "next/headers";
import "server-only";
import {
  CookieOptions,
  getChunkedCookie,
  setChunkedCookie
} from "../cookies/server";
import { LogEntry, Provider, Token, WORKFLOW_CONSTANTS } from "../workflow";
import { OAUTH_STATE_COOKIE_NAME } from "../workflow/constants";
import { decrypt, encrypt } from "./crypto";

// Use process.env.NODE_ENV directly to avoid issues with env import
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Only set secure in production
  sameSite: "lax" as const,
  path: "/"
};

/**
 * Retrieve an OAuth token from cookies and decrypt it.
 *
 * @param provider - Token owner (google or microsoft)
 * @param onLog - Optional log callback
 * @returns Decrypted token or null
 */
export async function getToken(
  provider: Provider,
  onLog?: (entry: LogEntry) => void
): Promise<Token | null> {
  const cookieName = `${provider}_token`;
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[getToken] NODE_ENV: ${process.env.NODE_ENV}`
  });

  // Use chunked cookie getter to handle large tokens
  const encryptedValue = await getChunkedCookie(cookieName);

  if (!encryptedValue) {
    return null;
  }

  try {
    const decrypted = decrypt(encryptedValue);
    const token = JSON.parse(decrypted);

    // Scopes are usually returned as a space-separated string, convert to array
    if (typeof token.scope === "string") {
      token.scope = token.scope.split(" ");
    }

    return token;
  } catch (error) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: `Failed to decrypt ${provider} token`,
      data: error
    });
    return null;
  }
}

/**
 * Persist an OAuth token in chunked cookie form.
 *
 * @param provider - Token owner
 * @param token - Token data to store
 * @param onLog - Optional log callback
 */
export async function setToken(
  provider: Provider,
  token: Token,
  onLog?: (entry: LogEntry) => void
): Promise<void> {
  const cookieName = `${provider}_token`;
  const encrypted = encrypt(JSON.stringify(token));
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[setToken] NODE_ENV: ${process.env.NODE_ENV}`
  });
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[setToken] Setting token for provider: ${provider}, cookie: ${cookieName}`
  });
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[setToken] Encrypted value size for ${provider}: ${encrypted.length} bytes`
  });

  try {
    const result = await setChunkedCookie(cookieName, encrypted, {
      ...COOKIE_OPTIONS,
      maxAge: WORKFLOW_CONSTANTS.TOKEN_COOKIE_MAX_AGE
    });
    if (!result.success) {
      throw new Error(result.error);
    }
  } catch (err) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: `[setToken] Failed to set cookie for ${provider}`,
      data: err
    });
  }
}

/**
 * Remove all cookie fragments for a stored token.
 *
 * @param provider - Token owner
 */
// Note: token deletion and state-cookie writing are now handled directly in the
// calling layers (sign-out route & OAuth redirect response). Keeping this file
// lean avoids unused-code bloat.

/**
 * Validate that the OAuth state cookie matches the provided value.
 *
 * @param state - Received state value
 * @param provider - Provider string to check against
 * @returns Whether the cookie matches and is within TTL
 */
export async function validateOAuthState(
  state: string,
  provider: string
): Promise<boolean> {
  const cookie = (await cookies()).get(OAUTH_STATE_COOKIE_NAME);
  if (!cookie) return false;

  try {
    const decrypted = decrypt(cookie.value);
    const data = JSON.parse(decrypted);

    // Check state matches and not expired (10 min)
    return (
      data.state === state
      && data.provider === provider
      && Date.now() - data.timestamp < WORKFLOW_CONSTANTS.OAUTH_STATE_TTL_MS
    );
  } catch {
    return false;
  }
}
