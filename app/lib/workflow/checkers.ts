import { Checker } from './types';
import { extractValueFromPath } from './variables';

export function evaluateChecker(
  checker: Checker,
  response: unknown,
  variables: Record<string, string>
): boolean {
  switch (checker.checker) {
    case 'exists':
      return response != null;

    case 'fieldTruthy': {
      if (!checker.field) return false;
      const value = extractValueFromPath(response, checker.field);
      return !!value;
    }

    case 'eq': {
      if (!checker.value) return false;
      let compareValue: unknown = response;

      if (checker.jsonPath) {
        compareValue = extractValueFromPath(response, checker.jsonPath);
      }

      // Substitute variables in the expected value
      const expectedValue = checker.value.replace(/\{([^}]+)\}/g, (match, varName) => {
        return variables[varName] || match;
      });

      return compareValue === expectedValue;
    }

    default:
      // For custom checkers defined in workflow
      return false;
  }
}
