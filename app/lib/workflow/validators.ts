import { VALIDATION_PATTERNS } from "./constants";

type ValidatorFunction = (val: string) => boolean;

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

export function validateVariable(value: string, validator?: string): boolean {
  if (!validator) return true;
  const fn = VALIDATOR_FUNCTIONS[validator];
  if (!fn) {
    console.error("Unknown validator pattern:", validator);
    return false;
  }
  return fn(value);
}
