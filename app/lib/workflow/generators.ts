import { randomBytes } from "crypto";
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
