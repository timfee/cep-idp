import { VALIDATION_PATTERNS } from "./constants";

/**
 * Validate a variable value against a pattern.
 *
 * @param value - Input string from the user
 * @param validator - RegExp pattern to test against
 * @returns True when the value satisfies the validator
 */
export function validateVariable(
  value: string,
  validator?: RegExp
): boolean {
  if (!validator) return true;
  return validator.test(value);
}
