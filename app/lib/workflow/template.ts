import {
  ERROR_MESSAGES,
  EXPECTED_ARG_COUNT_PAIR,
  VARIABLE_KEYS,
} from "./constants";
import { extractCertificateFromXml } from "./extractors";
import { generatePassword } from "./generators";

/**
 * Replace variable placeholders in a template string.
 *
 *  template - String with template variables
 *  variables - Map of available variables
 *  options - Optional substitution settings
 *  Interpolated string
 */

/**
 * Replace placeholders within a string with workflow variable values.
 *
 * @param template - Text containing `{var}` expressions
 * @param variables - Map of variable names to values
 * @param options - Substitution behaviour controls
 * @returns Interpolated string
 */
export function substituteVariables(
  template: string,
  variables: Record<string, string>,
  options: {
    throwOnMissing?: boolean;
    captureGenerated?: Record<string, string>;
  } = {}
): string {
  return template.replace(/\{([^{}]+)\}/g, (match, expression) => {
    if (expression.includes("(")) {
      try {
        const result = evaluateTemplateExpression(expression, variables);
        if (
          expression.startsWith("generatePassword(")
          && options.captureGenerated
        ) {
          options.captureGenerated[VARIABLE_KEYS.GENERATED_PASSWORD] = result;
        }
        return result;
      } catch (error) {
        if (options.throwOnMissing) {
          throw error;
        }
        console.warn(`Template expression failed: ${expression}`, error);
        return match;
      }
    }
    if (Object.prototype.hasOwnProperty.call(variables, expression)) {
      return variables[expression];
    }
    if (options.throwOnMissing) {
      throw new Error(ERROR_MESSAGES.VARIABLE_NOT_FOUND(expression));
    }
    console.warn(`Variable ${expression} not found, keeping placeholder`);
    return match;
  });
}

/**
 * Recursively substitute variables throughout an object.
 *
 * @param obj - Object or value to process
 * @param variables - Available variable map
 * @param options - Substitution behaviour controls
 * @returns Object with all string fields interpolated
 */
export function substituteObject(
  obj: unknown,
  variables: Record<string, string>,
  options: {
    throwOnMissing?: boolean;
    captureGenerated?: Record<string, string>;
  } = {}
): unknown {
  if (typeof obj === "string") {
    return substituteVariables(obj, variables, options);
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => substituteObject(item, variables, options));
  }
  if (obj && typeof obj === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteObject(value, variables, options);
    }
    return result;
  }
  return obj;
}

/**
 * Evaluate helper functions inside template expressions.
 *
 * @param expression - Template expression such as `concat(a,b)`
 * @param variables - Available variable values
 * @returns Result of the evaluated expression
 */
function evaluateTemplateExpression(
  expression: string,
  variables: Record<string, string>
): string {
  const match = expression.match(/^(\w+)\(([^)]*?)\)$/);
  if (!match) {
    throw new Error(`Invalid template expression: ${expression}`);
  }
  const [, functionName, argsString] = match;
  const args = parseTemplateArgs(argsString, variables);
  switch (functionName) {
    case "concat":
      return args.join("");
    case "format": {
      if (args.length === 0) {
        throw new Error("format() requires at least one argument");
      }
      const template = args[0];
      const values = args.slice(1);
      return formatString(template, values);
    }
    case "email": {
      if (args.length !== EXPECTED_ARG_COUNT_PAIR) {
        throw new Error(
          "email() requires exactly 2 arguments: username and domain"
        );
      }
      return `${args[0]}@${args[1]}`;
    }
    case "url": {
      if (args.length !== EXPECTED_ARG_COUNT_PAIR) {
        throw new Error("url() requires exactly 2 arguments: base and path");
      }
      const base = args[0].replace(/\/$/, "");
      const path = args[1].replace(/^\//, "");
      return `${base}/${path}`;
    }
    case "generatePassword": {
      if (args.length !== 1) {
        throw new Error(
          "generatePassword() requires exactly 1 argument: length"
        );
      }
      const length = parseInt(args[0], 10);
      if (isNaN(length) || length <= 0) {
        throw new Error("generatePassword() length must be a positive number");
      }
      return generatePassword(length);
    }
    case "extractCertificateFromXml": {
      if (args.length !== 1) {
        throw new Error(
          "extractCertificateFromXml() requires exactly 1 argument: xml string"
        );
      }
      return extractCertificateFromXml(args[0]);
    }
    default:
      throw new Error(`Unknown template function: ${functionName}`);
  }
}

/**
 * Split and resolve arguments for a template expression.
 *
 * @param argsString - Raw argument string from template
 * @param variables - Known variables for interpolation
 * @returns Array of resolved argument values
 */
function parseTemplateArgs(
  argsString: string,
  variables: Record<string, string>
): string[] {
  if (!argsString.trim()) {
    return [];
  }
  const args: string[] = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = "";
    } else if (!inQuotes && char === ",") {
      args.push(resolveTemplateArg(current.trim(), variables));
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) {
    args.push(resolveTemplateArg(current.trim(), variables));
  }
  return args;
}

/**
 * Resolve a single argument value from a template expression.
 *
 * @param arg - Raw argument string
 * @param variables - Available variables for lookup
 * @returns Resolved argument value
 */
function resolveTemplateArg(
  arg: string,
  variables: Record<string, string>
): string {
  if (
    (arg.startsWith('"') && arg.endsWith('"'))
    || (arg.startsWith("'") && arg.endsWith("'"))
  ) {
    return arg.slice(1, -1);
  }
  if (Object.prototype.hasOwnProperty.call(variables, arg)) {
    return variables[arg];
  }
  return arg;
}

/**
 * Simple `%s` formatter used by `format()` template helper.
 *
 * @param template - Format string containing `%s` tokens
 * @param values - Values to substitute into the template
 * @returns Formatted string
 */
function formatString(template: string, values: string[]): string {
  let result = template;
  let valueIndex = 0;
  result = result.replace(/%s/g, () => {
    if (valueIndex < values.length) {
      return values[valueIndex++];
    }
    return "%s";
  });
  return result;
}

/**
 * Discover which variables referenced in a template are not yet provided.
 *
 * @param template - Template string with placeholders
 * @param variables - Currently defined variables
 * @returns Array of variable names that are missing
 */
export function extractMissingVariables(
  template: string,
  variables: Record<string, string>
): string[] {
  const missing: string[] = [];
  const matches = template.matchAll(/\{([^{}]+)\}/g);
  for (const match of matches) {
    const expression = match[1];
    if (expression.includes("(")) {
      const functionVars = extractVariablesFromExpression(expression);
      for (const varName of functionVars) {
        if (!(varName in variables) && !missing.includes(varName)) {
          missing.push(varName);
        }
      }
    } else if (!(expression in variables) && !missing.includes(expression)) {
      missing.push(expression);
    }
  }
  return missing;
}

/**
 * Parse a template expression and return the variables it references.
 *
 * @param expression - Expression string inside `{}` braces
 * @returns Array of variable names found within the expression
 */
function extractVariablesFromExpression(expression: string): string[] {
  const extractedVariables: string[] = [];
  const match = expression.match(/^(\w+)\(([^)]*?)\)$/);
  if (match) {
    const [, , argsString] = match;
    if (argsString.trim()) {
      const args = argsString.split(",").map((arg) => arg.trim());
      for (const arg of args) {
        if (
          !arg.startsWith('"')
          && !arg.startsWith("'")
          && !arg.includes("(")
          && /^\w+$/.test(arg)
        ) {
          extractedVariables.push(arg);
        }
      }
    }
  }
  return extractedVariables;
}

export {
  evaluateTemplateExpression,
  extractVariablesFromExpression,
  formatString,
  parseTemplateArgs,
  resolveTemplateArg,
};
