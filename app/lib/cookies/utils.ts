// Shared cookie utilities
import { COOKIE_METADATA_SIZES, WORKFLOW_CONSTANTS } from "../workflow";

const MAX_COOKIE_SIZE = WORKFLOW_CONSTANTS.MAX_COOKIE_SIZE;
// Re-export for callers that previously imported from utils.
export { CHUNK_DELIMITER } from "./constants";

/**
 * Split a value into cookie-sized chunks.
 *
 * @param value - Raw cookie string
 * @returns Array of chunked pieces
 */
export function splitIntoChunks(value: string): string[] {
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
 * Roughly estimate the size of a cookie including metadata.
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options used for encoding
 * @returns Approximate total size in bytes
 */
export function estimateCookieSize(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    maxAge?: number;
    domain?: string;
  } = {}
): number {
  let size = name.length + 1 + value.length;
  if (options.path) size += COOKIE_METADATA_SIZES.PATH + options.path.length;
  if (options.maxAge)
    size += COOKIE_METADATA_SIZES.MAX_AGE + options.maxAge.toString().length;
  if (options.sameSite)
    size += COOKIE_METADATA_SIZES.SAME_SITE + options.sameSite.length;
  if (options.httpOnly) size += COOKIE_METADATA_SIZES.HTTP_ONLY;
  if (options.secure) size += COOKIE_METADATA_SIZES.SECURE;
  if (options.domain)
    size += COOKIE_METADATA_SIZES.DOMAIN + options.domain.length;
  return size;
}

/**
 * Check whether a cookie value will fit within the maximum size.
 *
 * @param name - Cookie name
 * @param value - Cookie value
 * @param options - Cookie options
 * @returns True if the cookie is within size limits
 */
type CookieOptions = {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "lax" | "strict" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
};

export function validateCookieSize(
  name: string,
  value: string,
  options: CookieOptions
): boolean {
  const estimatedSize = estimateCookieSize(name, value, options);
  return estimatedSize <= MAX_COOKIE_SIZE;
}

/**
 * Build the standard metadata object stored in the root cookie when a value
 * must be chunked.
 *
 * @param chunkCount - Number of value fragments
 */
export function buildChunkMetadata(chunkCount: number): {
  chunked: true;
  count: number;
  timestamp: number;
} {
  return {
    chunked: true,
    count: chunkCount,
    timestamp: Date.now(),
  } as const;
}
