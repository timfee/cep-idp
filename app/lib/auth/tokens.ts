import "server-only";
import { cookies } from "next/headers";
import {
  Token,
  WORKFLOW_CONSTANTS,
  MS_IN_SECOND,
  LogEntry,
  Provider,
} from "../workflow";
import {
  clearChunkedCookie,
  getChunkedCookie,
  setChunkedCookie,
  CookieOptions,
} from "./cookie-server";
import { decrypt, encrypt } from "./crypto";

// Use process.env.NODE_ENV directly to avoid issues with env import
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Only set secure in production
  sameSite: "lax" as const,
  path: "/",
};

export async function getToken(
  provider: Provider,
  onLog?: (entry: LogEntry) => void,
): Promise<Token | null> {
  const cookieName = `${provider}_token`;
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[getToken] NODE_ENV: ${process.env.NODE_ENV}`,
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
      data: error,
    });
    return null;
  }
}

export async function setToken(
  provider: Provider,
  token: Token,
  onLog?: (entry: LogEntry) => void,
): Promise<void> {
  const cookieName = `${provider}_token`;
  const encrypted = encrypt(JSON.stringify(token));
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[setToken] NODE_ENV: ${process.env.NODE_ENV}`,
  });
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[setToken] Setting token for provider: ${provider}, cookie: ${cookieName}`,
  });
  onLog?.({
    timestamp: Date.now(),
    level: "info",
    message: `[setToken] Encrypted value size for ${provider}: ${encrypted.length} bytes`,
  });

  try {
    const result = await setChunkedCookie(cookieName, encrypted, {
      ...COOKIE_OPTIONS,
      maxAge: WORKFLOW_CONSTANTS.TOKEN_COOKIE_MAX_AGE,
    });
    if (!result.success) {
      throw new Error(result.error);
    }
  } catch (err) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: `[setToken] Failed to set cookie for ${provider}`,
      data: err,
    });
  }
}

export async function deleteToken(provider: Provider): Promise<void> {
  const cookieName = `${provider}_token`;
  // Use chunked cookie clearer to remove all chunks
  await clearChunkedCookie(cookieName);
}

// OAuth state management for CSRF protection
export async function setOAuthState(
  state: string,
  provider: string,
): Promise<void> {
  const data = { state, provider, timestamp: Date.now() };
  const encrypted = encrypt(JSON.stringify(data));

  (await cookies()).set("oauth_state", encrypted, {
    ...COOKIE_OPTIONS,
    maxAge: WORKFLOW_CONSTANTS.OAUTH_STATE_TTL_MS / MS_IN_SECOND,
  });
}

export async function validateOAuthState(
  state: string,
  provider: string,
): Promise<boolean> {
  const cookie = (await cookies()).get("oauth_state");
  if (!cookie) return false;

  try {
    const decrypted = decrypt(cookie.value);
    const data = JSON.parse(decrypted);

    // Check state matches and not expired (10 min)
    return (
      data.state === state &&
      data.provider === provider &&
      Date.now() - data.timestamp < WORKFLOW_CONSTANTS.OAUTH_STATE_TTL_MS
    );
  } catch {
    return false;
  }
}
