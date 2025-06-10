import "server-only";
import { decrypt, encrypt } from "../auth/crypto";
import {
  clearChunkedCookie,
  CookieOptions,
  getChunkedCookie,
  setChunkedCookie,
} from "../cookies/server";
import { WORKFLOW_CONSTANTS } from "./constants";
import { LogEntry } from "./types";

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/**
 * Retrieve workflow variables from the encrypted cookie store.
 *
 * @param onLog - Optional log callback
 * @returns Key/value map of stored variables
 */
export async function getStoredVariables(
  onLog?: (entry: LogEntry) => void
): Promise<Record<string, string>> {
  const encrypted = await getChunkedCookie(
    WORKFLOW_CONSTANTS.VARIABLES_COOKIE_NAME,
    onLog
  );
  if (!encrypted) return {};
  try {
    const decrypted = decrypt(encrypted);
    return JSON.parse(decrypted);
  } catch (err) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: "Failed to decrypt variables",
      data: err,
    });
    return {};
  }
}

/**
 * Persist workflow variables to the encrypted cookie store.
 *
 * @param vars - Variables to persist
 * @param onLog - Optional log callback
 */
export async function setStoredVariables(
  vars: Record<string, string>,
  onLog?: (entry: LogEntry) => void
): Promise<void> {
  const encrypted = encrypt(JSON.stringify(vars));
  const result = await setChunkedCookie(
    WORKFLOW_CONSTANTS.VARIABLES_COOKIE_NAME,
    encrypted,
    { ...COOKIE_OPTIONS, maxAge: WORKFLOW_CONSTANTS.VARIABLES_COOKIE_MAX_AGE },
    onLog
  );
  if (!result.success) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: result.error || "Failed to set cookie",
    });
  }
}

/**
 * Clear all stored workflow variables.
 *
 * @param onLog - Optional log callback
 */
export async function clearStoredVariables(
  onLog?: (entry: LogEntry) => void
): Promise<void> {
  await clearChunkedCookie(WORKFLOW_CONSTANTS.VARIABLES_COOKIE_NAME, onLog);
}
