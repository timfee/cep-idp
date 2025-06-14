import { VALIDATION_PATTERNS } from "./constants";

/** Generic validator function signature. */
type ValidatorFunction = (val: string) => boolean;

/**
 * Very small domain validation helper used by workflow variables.
 *
 * @param value - Domain string to validate
 * @returns Whether the domain resembles a valid DNS name
 */
function isValidDomain(value: string): boolean {
  if (!value.includes(".")) return false;
  const parts = value.split(".");
  if (parts.some((p) => p.trim() === "")) return false;
  const tld = parts[parts.length - 1];
  return /^[A-Za-z]{2,}$/.test(tld);
}

const VALIDATOR_FUNCTIONS: Record<string, ValidatorFunction> = {
  [VALIDATION_PATTERNS.CUSTOMER_ID.source]: (val) =>
    VALIDATION_PATTERNS.CUSTOMER_ID.test(val),
  [VALIDATION_PATTERNS.DOMAIN.source]: isValidDomain,
};

/**
 * Validate a variable value against a named pattern.
 *
 * @param value - Input string from the user
 * @param validator - Name of validator pattern
 * @returns True when the value satisfies the validator
 */
export function validateVariable(
  value: string,
  validator?: string | RegExp
): boolean {
  if (!validator) return true;

  // Direct RegExp validation when a pattern is supplied inline
  if (validator instanceof RegExp) {
    return validator.test(value);
  }

  const fn = VALIDATOR_FUNCTIONS[validator];
  if (!fn) {
    console.error("Unknown validator pattern:", validator);
    return false;
  }
  return fn(value);
}
