import "server-only";
import { cookies } from "next/headers";
import { WORKFLOW_CONSTANTS, LogEntry } from "../workflow";
import { COOKIE_METADATA_KEYS } from "../workflow/constants";
import { splitIntoChunks, estimateCookieSize } from "./cookie-utils";

const CHUNK_DELIMITER = ".chunk.";
const MAX_COOKIE_SIZE = WORKFLOW_CONSTANTS.MAX_COOKIE_SIZE;

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
}

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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to set cookie",
      };
    }
  }

  const chunks = splitIntoChunks(value);
  const metadata = {
    [COOKIE_METADATA_KEYS.CHUNKED]: true,
    [COOKIE_METADATA_KEYS.COUNT]: chunks.length,
    [COOKIE_METADATA_KEYS.TIMESTAMP]: Date.now(),
  };
  const metadataSize = estimateCookieSize(
    name,
    JSON.stringify(metadata),
    options,
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

export async function getChunkedCookie(
  name: string,
  onLog?: (entry: LogEntry) => void,
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

export async function clearChunkedCookie(
  name: string,
  onLog?: (entry: LogEntry) => void,
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

export function setChunkedCookieOnResponse(
  response: Response,
  name: string,
  value: string,
  options: CookieOptions = {},
  onLog?: (entry: LogEntry) => void,
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
    const metadata = {
      chunked: true,
      count: chunks.length,
      timestamp: Date.now(),
    };
    response.headers.append(
      "Set-Cookie",
      buildCookieString(name, JSON.stringify(metadata)),
    );
    for (let i = 0; i < chunks.length; i++) {
      const chunkName = `${name}${CHUNK_DELIMITER}${i}`;
      response.headers.append(
        "Set-Cookie",
        buildCookieString(chunkName, chunks[i]),
      );
    }
  }
}
