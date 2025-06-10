import { CHECKER_TYPES } from "./constants";
import { extractValueFromPath } from "./variables";

/**
 * Evaluate a workflow checker definition against an API response.
 *
 * @param checker - Checker configuration from workflow
 * @param response - API response data to evaluate
 * @returns Result of the checker evaluation
 */
export function evaluateChecker(
  checker: {
    checker?: string;
    field?: string;
    value?: string;
    jsonPath?: string;
  },
  response: unknown
): boolean {
  switch (checker.checker) {
    case CHECKER_TYPES.EXISTS:
      return response != null;
    case CHECKER_TYPES.FIELD_TRUTHY: {
      if (!checker.field) return false;
      const value = extractValueFromPath(response, checker.field);
      return !!value;
    }
    case CHECKER_TYPES.EQ: {
      let compareValue: unknown = checker.value;
      if (checker.jsonPath) {
        compareValue = extractValueFromPath(response, checker.jsonPath);
      }
      return response === compareValue;
    }
    default:
      return true;
  }
}
