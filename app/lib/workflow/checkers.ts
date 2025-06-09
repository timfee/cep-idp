import { extractValueFromPath } from "./variables";

export function evaluateChecker(
  checker: { checker?: string; field?: string; value?: string; jsonPath?: string },
  response: unknown
): boolean {
  switch (checker.checker) {
    case "exists":
      return response != null;
    case "fieldTruthy": {
      if (!checker.field) return false;
      const value = extractValueFromPath(response, checker.field);
      return !!value;
    }
    case "eq": {
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
