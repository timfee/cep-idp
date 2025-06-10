import { cookies } from "next/headers";
import { WORKFLOW_CONSTANTS, COOKIE_METADATA_SIZES, LogEntry } from "../workflow";
import { COOKIE_METADATA_KEYS } from "../workflow/all-constants";

// Safe limit is around 4093 bytes per cookie, but we'll use constant to leave room for cookie metadata
const MAX_COOKIE_SIZE = WORKFLOW_CONSTANTS.MAX_COOKIE_SIZE;
const CHUNK_DELIMITER = ".chunk.";

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
}

/**
 * Splits a large value into chunks that fit within cookie size limits
 */
function splitIntoChunks(value: string): string[] {
  if (value.length <= MAX_COOKIE_SIZE) {
    return [value];
  }

  const chunks: string[] = [];
  for (let i = 0; i < value.length; i += MAX_COOKIE_SIZE) {
    chunks.push(value.slice(i, i + MAX_COOKIE_SIZE));
  }
  return chunks;
}

/**
 * Sets a potentially large cookie by splitting it into chunks if necessary
 */
export async function setChunkedCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
  onLog?: (entry: LogEntry) => void,
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();

  await clearChunkedCookie(name);

  const singleSize = estimateCookieSize(name, value, options);
  if (singleSize <= MAX_COOKIE_SIZE) {
    try {
      cookieStore.set(name, value, options);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to set cookie' };
    }
  }

  const chunks = splitIntoChunks(value);
  const metadata = {
    [COOKIE_METADATA_KEYS.CHUNKED]: true,
    [COOKIE_METADATA_KEYS.COUNT]: chunks.length,
    [COOKIE_METADATA_KEYS.TIMESTAMP]: Date.now(),
  };
  const metadataSize = estimateCookieSize(name, JSON.stringify(metadata), options);
  if (metadataSize > MAX_COOKIE_SIZE) {
    return { success: false, error: `Metadata too large: ${metadataSize} bytes` };
  }

  const totalSize = chunks.reduce((sum, chunk, i) => {
    const chunkName = i === 0 ? name : `${name}${CHUNK_DELIMITER}${i}`;
    return sum + estimateCookieSize(chunkName, chunk, options);
  }, metadataSize);

  if (totalSize > MAX_COOKIE_SIZE * (chunks.length + 1)) {
    return { success: false, error: `Data too large: ${totalSize} bytes exceeds maximum` };
  }

  try {
    onLog?.({
      timestamp: Date.now(),
      level: "info",
      message: `[Cookie Utils] Splitting ${name} into ${chunks.length} chunks`,
    });
    cookieStore.set(name, JSON.stringify(metadata), options);
    for (let i = 0; i < chunks.length; i++) {
      const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `[Cookie Utils] Setting chunk ${i}: ${chunkName} (${chunks[i].length} bytes)`,
      });
      cookieStore.set(chunkName, chunks[i], options);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Failed to set cookie' };
  }
}

/**
 * Gets a potentially chunked cookie and reconstructs it
 */
export async function getChunkedCookie(
  name: string,
  onLog?: (entry: LogEntry) => void,
): Promise<string | null> {
  const cookieStore = await cookies();
  const mainCookie = cookieStore.get(name);

  if (!mainCookie) {
    return null;
  }

  // Try to parse as metadata
  try {
    const metadata = JSON.parse(mainCookie.value);

    if (metadata.chunked && typeof metadata.count === "number") {
      // This is a chunked cookie, reconstruct it
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `[Cookie Utils] Reconstructing ${name} from ${metadata.count} chunks`,
      });

      const chunks: string[] = [];
      for (let i = 0; i < metadata.count; i++) {
        const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
        const chunk = cookieStore.get(chunkName);

        if (!chunk) {
          onLog?.({
            timestamp: Date.now(),
            level: "error",
            message: `[Cookie Utils] Missing chunk ${i} for ${name}`,
          });
          return null;
        }

        chunks.push(chunk.value);
      }

      const reconstructed = chunks.join("");
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `[Cookie Utils] Reconstructed ${name}: ${reconstructed.length} bytes`,
      });
      return reconstructed;
    }
  } catch {
    // Not metadata, just a regular cookie
  }

  // Regular cookie, return as-is
  return mainCookie.value;
}

/**
 * Clears a potentially chunked cookie and all its chunks
 */
export async function clearChunkedCookie(
  name: string,
  onLog?: (entry: LogEntry) => void,
): Promise<void> {
  const cookieStore = await cookies();

  // Get the main cookie to check if it's chunked
  const mainCookie = cookieStore.get(name);

  if (mainCookie) {
    try {
      const metadata = JSON.parse(mainCookie.value);

      if (metadata.chunked && typeof metadata.count === "number") {
        // Clear all chunks
        onLog?.({
          timestamp: Date.now(),
          level: "info",
          message: `[Cookie Utils] Clearing ${metadata.count} chunks for ${name}`,
        });
        for (let i = 0; i < metadata.count; i++) {
          const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
          cookieStore.delete(chunkName);
        }
      }
    } catch {
      // Not chunked metadata
    }

    // Clear the main cookie
    cookieStore.delete(name);
  }

  // Also clear any orphaned chunks (in case of errors)
  const allCookies = cookieStore.getAll();
  const chunkPrefix = `${name}${CHUNK_DELIMITER}`;

  for (const cookie of allCookies) {
    if (cookie.name.startsWith(chunkPrefix)) {
      cookieStore.delete(cookie.name);
    }
  }
}

/**
 * Sets a chunked cookie on a NextResponse object (for use in route handlers)
 */
export function setChunkedCookieOnResponse(
  response: Response,
  name: string,
  value: string,
  options: CookieOptions = {},
  onLog?: (entry: LogEntry) => void,
): void {
  const chunks = splitIntoChunks(value);

  // Build cookie strings
  const buildCookieString = (cookieName: string, cookieValue: string) => {
    let str = `${cookieName}=${cookieValue}`;
    if (options.path) str += `; Path=${options.path}`;
    if (options.maxAge) str += `; Max-Age=${options.maxAge}`;
    if (options.sameSite) str += `; SameSite=${options.sameSite}`;
    if (options.httpOnly) str += `; HttpOnly`;
    if (options.secure) str += `; Secure`;
    if (options.domain) str += `; Domain=${options.domain}`;
    return str;
  };

  if (chunks.length === 1) {
    // Single cookie

    response.headers.append("Set-Cookie", buildCookieString(name, value));
  } else {
    // Multiple chunks
    onLog?.({
      timestamp: Date.now(),
      level: "info",
      message: `[Cookie Utils] Setting ${chunks.length} chunks on response for ${name}`,
    });

    // Set metadata cookie
    const metadata = {
      chunked: true,
      count: chunks.length,
      timestamp: Date.now(),
    };
    response.headers.append(
      "Set-Cookie",
      buildCookieString(name, JSON.stringify(metadata)),
    );

    // Set each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
      response.headers.append(
        "Set-Cookie",
        buildCookieString(chunkName, chunks[i]),
      );
    }
  }
}

/**
 * Estimates the size of a cookie including its name and attributes
 */
export function estimateCookieSize(
  name: string,
  value: string,
  options: CookieOptions = {},
): number {
  let size = name.length + 1 + value.length; // name=value

  if (options.path) size += COOKIE_METADATA_SIZES.PATH + options.path.length; // ; Path=/
  if (options.maxAge) size += COOKIE_METADATA_SIZES.MAX_AGE + options.maxAge.toString().length; // ; Max-Age=
  if (options.sameSite) size += COOKIE_METADATA_SIZES.SAME_SITE + options.sameSite.length; // ; SameSite=
  if (options.httpOnly) size += COOKIE_METADATA_SIZES.HTTP_ONLY; // ; HttpOnly
  if (options.secure) size += COOKIE_METADATA_SIZES.SECURE; // ; Secure
  if (options.domain) size += COOKIE_METADATA_SIZES.DOMAIN + options.domain.length; // ; Domain=

  return size;
}

export function validateCookieSize(name: string, value: string, options: CookieOptions): boolean {
  const estimatedSize = estimateCookieSize(name, value, options);
  return estimatedSize <= MAX_COOKIE_SIZE;
}
