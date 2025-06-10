import { extractValueFromPath } from "./variables";
import { CHECKER_TYPES } from "./constants";

export function evaluateChecker(
  checker: {
    checker?: string;
    field?: string;
    value?: string;
    jsonPath?: string;
  },
  response: unknown,
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
