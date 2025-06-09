import { cookies } from "next/headers";
import { Token } from "../workflow/types";
import { decrypt, encrypt } from "./crypto";
import {
  getChunkedCookie,
  setChunkedCookie,
  clearChunkedCookie,
  CookieOptions,
} from "./cookie-utils";

// Use process.env.NODE_ENV directly to avoid issues with env import
const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production", // Only set secure in production
  sameSite: "lax" as const,
  path: "/",
};

export async function getToken(
  provider: "google" | "microsoft",
): Promise<Token | null> {
  const cookieName = `${provider}_token`;
  console.log(
    `[getToken] NODE_ENV:`,
    process.env.NODE_ENV,
    "COOKIE_OPTIONS.secure:",
    COOKIE_OPTIONS.secure,
  );

  console.log(`Retrieving ${provider} token from cookie:`, cookieName);

  // Use chunked cookie getter to handle large tokens
  const encryptedValue = await getChunkedCookie(cookieName);

  if (!encryptedValue) {
    console.log(`No ${provider} token found`);
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
    console.error(`Failed to decrypt ${provider} token:`, error);
    return null;
  }
}

export async function setToken(
  provider: "google" | "microsoft",
  token: Token,
): Promise<void> {
  const cookieName = `${provider}_token`;
  const encrypted = encrypt(JSON.stringify(token));
  console.log(
    `[setToken] NODE_ENV:`,
    process.env.NODE_ENV,
    "COOKIE_OPTIONS.secure:",
    COOKIE_OPTIONS.secure,
  );
  console.log(
    `[setToken] Setting token for provider: ${provider}, cookie: ${cookieName}`,
  );
  console.log(
    `[setToken] Encrypted value size for ${provider}: ${encrypted.length} bytes`,
  );

  try {
    // Use chunked cookie setter to handle large tokens
    await setChunkedCookie(cookieName, encrypted, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });
    console.log(`[setToken] Cookie set for ${provider}`);
  } catch (err) {
    console.error(`[setToken] Failed to set cookie for ${provider}:`, err);
  }
}

export async function deleteToken(
  provider: "google" | "microsoft",
): Promise<void> {
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
    maxAge: 600, // 10 minutes
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
      Date.now() - data.timestamp < 600000
    );
  } catch {
    return false;
  }
}
