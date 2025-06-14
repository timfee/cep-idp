import { cookies } from "next/headers";
import "server-only";
import { LogEntry, WORKFLOW_CONSTANTS } from "../workflow";
import { CHUNK_DELIMITER } from "./constants";
import {
  buildChunkMetadata,
  estimateCookieSize,
  splitIntoChunks,
} from "./utils";

const MAX_COOKIE_SIZE = WORKFLOW_CONSTANTS.MAX_COOKIE_SIZE;

/**
 * Options used when creating or manipulating cookies.
 */
export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
}

/**
 * Store a potentially large cookie by splitting it into multiple chunks.
 *
 * @param name - Cookie name
 * @param value - Cookie value to store
 * @param options - Standard cookie options
 * @param onLog - Optional log handler
 * @returns Success status and optional error message
 */
export async function setChunkedCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
  onLog?: (entry: LogEntry) => void
): Promise<{ success: boolean; error?: string }> {
  const cookieStore = await cookies();
  await clearChunkedCookie(name);

  const singleSize = estimateCookieSize(name, value, options);
  if (singleSize <= MAX_COOKIE_SIZE) {
    try {
      cookieStore.set(name, value, options);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set cookie",
      };
    }
  }

  const chunks = splitIntoChunks(value);
  const metadata = buildChunkMetadata(chunks.length);
  const metadataSize = estimateCookieSize(
    name,
    JSON.stringify(metadata),
    options
  );
  if (metadataSize > MAX_COOKIE_SIZE) {
    return {
      success: false,
      error: `Metadata too large: ${metadataSize} bytes`,
    };
  }

  const totalSize = chunks.reduce((sum, chunk, i) => {
    const chunkName = i === 0 ? name : `${name}${CHUNK_DELIMITER}${i}`;
    return sum + estimateCookieSize(chunkName, chunk, options);
  }, metadataSize);

  if (totalSize > MAX_COOKIE_SIZE * (chunks.length + 1)) {
    return {
      success: false,
      error: `Data too large: ${totalSize} bytes exceeds maximum`,
    };
  }

  try {
    onLog?.({
      timestamp: Date.now(),
      level: "info",
      message: `[Cookie Server] Splitting ${name} into ${chunks.length} chunks`,
    });
    cookieStore.set(name, JSON.stringify(metadata), options);
    for (let i = 0; i < chunks.length; i++) {
      const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `[Cookie Server] Setting chunk ${i}: ${chunkName} (${chunks[i].length} bytes)`,
      });
      cookieStore.set(chunkName, chunks[i], options);
    }
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to set cookie",
    };
  }
}

/**
 * Retrieve and reassemble a chunked cookie value.
 *
 * @param name - Cookie name
 * @param onLog - Optional log handler
 * @returns The reconstructed value or `null`
 */
export async function getChunkedCookie(
  name: string,
  onLog?: (entry: LogEntry) => void
): Promise<string | null> {
  const cookieStore = await cookies();
  const mainCookie = cookieStore.get(name);
  if (!mainCookie) {
    return null;
  }
  try {
    const metadata = JSON.parse(mainCookie.value);
    if (metadata.chunked && typeof metadata.count === "number") {
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `[Cookie Server] Reconstructing ${name} from ${metadata.count} chunks`,
      });
      const chunks: string[] = [];
      for (let i = 0; i < metadata.count; i++) {
        const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
        const chunk = cookieStore.get(chunkName);
        if (!chunk) {
          onLog?.({
            timestamp: Date.now(),
            level: "error",
            message: `[Cookie Server] Missing chunk ${i} for ${name}`,
          });
          return null;
        }
        chunks.push(chunk.value);
      }
      const reconstructed = chunks.join("");
      onLog?.({
        timestamp: Date.now(),
        level: "info",
        message: `[Cookie Server] Reconstructed ${name}: ${reconstructed.length} bytes`,
      });
      return reconstructed;
    }
  } catch {
    // Not metadata, just a regular cookie
  }
  return mainCookie.value;
}

/**
 * Remove a previously stored chunked cookie.
 *
 * @param name - Cookie name
 * @param onLog - Optional log handler
 */
export async function clearChunkedCookie(
  name: string,
  onLog?: (entry: LogEntry) => void
): Promise<void> {
  const cookieStore = await cookies();
  const mainCookie = cookieStore.get(name);
  if (mainCookie) {
    try {
      const metadata = JSON.parse(mainCookie.value);
      if (metadata.chunked && typeof metadata.count === "number") {
        onLog?.({
          timestamp: Date.now(),
          level: "info",
          message: `[Cookie Server] Clearing ${metadata.count} chunks for ${name}`,
        });
        for (let i = 0; i < metadata.count; i++) {
          const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
          cookieStore.delete(chunkName);
        }
      }
    } catch {
      // Not chunked metadata
    }
    cookieStore.delete(name);
  }
  const allCookies = cookieStore.getAll();
  const chunkPrefix = `${name}${CHUNK_DELIMITER}`;
  for (const cookie of allCookies) {
    if (cookie.name.startsWith(chunkPrefix)) {
      cookieStore.delete(cookie.name);
    }
  }
}

/**
 * Attach chunked cookie headers to an outgoing response.
 *
 * @param response - HTTP response to modify
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options applied to each chunk
 * @param onLog - Optional log handler
 */
export function setChunkedCookieOnResponse(
  response: Response,
  name: string,
  value: string,
  options: CookieOptions = {},
  onLog?: (entry: LogEntry) => void
): void {
  const chunks = splitIntoChunks(value);
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
    response.headers.append("Set-Cookie", buildCookieString(name, value));
  } else {
    onLog?.({
      timestamp: Date.now(),
      level: "info",
      message: `[Cookie Server] Setting ${chunks.length} chunks on response for ${name}`,
    });
    const metadata = buildChunkMetadata(chunks.length);
    response.headers.append(
      "Set-Cookie",
      buildCookieString(name, JSON.stringify(metadata))
    );
    for (let i = 0; i < chunks.length; i++) {
      const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
      response.headers.append(
        "Set-Cookie",
        buildCookieString(chunkName, chunks[i])
      );
    }
  }
}
