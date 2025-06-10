// Shared cookie utilities
import { WORKFLOW_CONSTANTS, COOKIE_METADATA_SIZES } from "../workflow";

const MAX_COOKIE_SIZE = WORKFLOW_CONSTANTS.MAX_COOKIE_SIZE;
export const CHUNK_DELIMITER = ".chunk.";

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

export function estimateCookieSize(
  name: string,
  value: string,
  options: { httpOnly?: boolean; secure?: boolean; sameSite?: "lax" | "strict" | "none"; path?: string; maxAge?: number; domain?: string } = {},
): number {
  let size = name.length + 1 + value.length;
  if (options.path) size += COOKIE_METADATA_SIZES.PATH + options.path.length;
  if (options.maxAge) size += COOKIE_METADATA_SIZES.MAX_AGE + options.maxAge.toString().length;
  if (options.sameSite) size += COOKIE_METADATA_SIZES.SAME_SITE + options.sameSite.length;
  if (options.httpOnly) size += COOKIE_METADATA_SIZES.HTTP_ONLY;
  if (options.secure) size += COOKIE_METADATA_SIZES.SECURE;
  if (options.domain) size += COOKIE_METADATA_SIZES.DOMAIN + options.domain.length;
  return size;
}

export function validateCookieSize(name: string, value: string, options: Parameters<typeof estimateCookieSize>[2]): boolean {
  const estimatedSize = estimateCookieSize(name, value, options);
  return estimatedSize <= MAX_COOKIE_SIZE;
}
