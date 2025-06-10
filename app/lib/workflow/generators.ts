import { randomBytes } from "crypto";
import { ERROR_MESSAGES } from "./constants";

export const PASSWORD_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
export const PASSWORD_GENERATOR_REGEX = /randomPassword\((\d+)\)/;

export function generatePassword(length: number): string {
  const bytes = randomBytes(length);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARS[bytes[i] % PASSWORD_CHARS.length];
  }
  return password;
}

export function evaluateGenerator(generator: string): string {
  const passwordMatch = generator.match(PASSWORD_GENERATOR_REGEX);
  if (passwordMatch) {
    return generatePassword(parseInt(passwordMatch[1], 10));
  }
  throw new Error(ERROR_MESSAGES.UNKNOWN_GENERATOR(generator));
}
