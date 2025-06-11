import { randomBytes, createHash } from "crypto";
import { ERROR_MESSAGES } from "./constants";

/** Character set used when generating random passwords. */
export const PASSWORD_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
export const PASSWORD_GENERATOR_REGEX = /randomPassword\((\d+)\)/;

/**
 * Generate a random password of the given length.
 *
 * @param length - Desired password length
 * @returns Newly generated password string
 */
export function generatePassword(length: number): string {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return password;
}

/**
 * Generate a deterministic password based on a seed value.
 * Uses a hash of the seed plus a secret suffix to ensure uniqueness.
 *
 * @param seed - Domain name or other unique identifier
 * @returns A consistent 16-character password for the given seed
 */
export function generateDeterministicPassword(seed: string): string {
  // Add a suffix to make it less guessable
  const input = `${seed}-azuread-provisioning-2024`;
  const hash = createHash('sha256').update(input).digest('hex');

  // Take first 12 chars of hash and add special chars for complexity
  const base = hash.substring(0, 12);
  return `${base}!Aa1`;
}

/**
 * Evaluate a generator expression found in the workflow configuration.
 *
 * @param generator - Generator expression such as `randomPassword(12)`
 * @returns Generated value
 */
export function evaluateGenerator(generator: string): string {
  const passwordMatch = generator.match(PASSWORD_GENERATOR_REGEX);
  if (passwordMatch) {
    return generatePassword(parseInt(passwordMatch[1], 10));
  }
  throw new Error(ERROR_MESSAGES.UNKNOWN_GENERATOR(generator));
}
