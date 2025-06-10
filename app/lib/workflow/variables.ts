import { JSONPath } from "jsonpath-plus";
import { randomBytes } from "crypto";
import {
  EXPECTED_ARG_COUNT_PAIR,
  VARIABLE_KEYS,
} from "./constants";
import {
  PASSWORD_CHARS,
  PASSWORD_GENERATOR_REGEX,
  VALIDATION_PATTERNS,
  ERROR_MESSAGES,
} from "./constants";
import { hasOwnProperty } from "../utils";

export function extractCertificateFromXml(xmlString: string): string {
  const signingBlockMatch = xmlString.match(
    /<KeyDescriptor[^>]*use="signing"[^>]*>[\s\S]*?<\/KeyDescriptor>/,
  );

  if (!signingBlockMatch) {
    throw new Error("No signing certificate found in federation metadata");
  }

  const signingBlock = signingBlockMatch[0];

  const certMatch = signingBlock.match(
    /<X509Certificate[^>]*>([^<]+)<\/X509Certificate>/,
  );

  if (!certMatch || !certMatch[1]) {
    throw new Error("Could not extract certificate from federation metadata");
  }

  const base64Cert = certMatch[1].trim().replace(/\s+/g, "");
  const pemCert = `-----BEGIN CERTIFICATE-----\n${base64Cert
    .match(/.{1,64}/g)
    ?.join("\n")}\n-----END CERTIFICATE-----`;

  return pemCert;
}

export function generatePassword(length: number): string {
  const chars = PASSWORD_CHARS;
  const bytes = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

export function evaluateGenerator(generator: string): string {
  const passwordMatch = generator.match(PASSWORD_GENERATOR_REGEX);
  if (passwordMatch) {
    return generatePassword(parseInt(passwordMatch[1]));
  }
  throw new Error(ERROR_MESSAGES.UNKNOWN_GENERATOR(generator));
}

export function substituteVariables(
  template: string,
  variables: Record<string, string>,
  options: { throwOnMissing?: boolean; captureGenerated?: Record<string, string> } = {},
): string {
  return template.replace(/\{([^{}]+)\}/g, (match, expression) => {
    if (expression.includes("(")) {
      try {
        const result = evaluateTemplateExpression(expression, variables);
        if (
          expression.startsWith('generatePassword(') &&
          options.captureGenerated
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

function evaluateTemplateExpression(
  expression: string,
  variables: Record<string, string>,
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
          "email() requires exactly 2 arguments: username and domain",
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
          "generatePassword() requires exactly 1 argument: length",
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
          "extractCertificateFromXml() requires exactly 1 argument: xml string",
        );
      }
      return extractCertificateFromXml(args[0]);
    }
    default:
      throw new Error(`Unknown template function: ${functionName}`);
  }
}

function parseTemplateArgs(
  argsString: string,
  variables: Record<string, string>,
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

function resolveTemplateArg(
  arg: string,
  variables: Record<string, string>,
): string {
  if (
    (arg.startsWith('"') && arg.endsWith('"')) ||
    (arg.startsWith("'") && arg.endsWith("'"))
  ) {
    return arg.slice(1, -1);
  }

  if (Object.prototype.hasOwnProperty.call(variables, arg)) {
    return variables[arg];
  }

  return arg;
}

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

export function substituteObject(
  obj: unknown,
  variables: Record<string, string>,
  options: { throwOnMissing?: boolean; captureGenerated?: Record<string, string> } = {},
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

export function extractValueFromPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  try {
    if (path.startsWith("$") || path.includes("[?(") || path.includes("[*]")) {
      const results = JSONPath({ path, json: obj, wrap: false });

      if (Array.isArray(results)) {
        if (
          results.length === 1 &&
          !path.includes("[*]") &&
          !path.includes("..")
        ) {
          return results[0];
        } else if (results.length === 0) {
          return undefined;
        } else {
          return results;
        }
      }

      return results;
    }

    if (path.includes("findBy(")) {
      return evaluateTemplateFunction(obj, path);
    }

    if (path.includes("[") && path.includes("=")) {
      return evaluatePredicatePath(obj, path);
    }

    if (path === "primaryDomain" && hasDomainsArray(obj)) {
      const data = obj as {
        domains: Array<{ isPrimary?: boolean; domainName?: string }>;
      };
      const primaryDomain = data.domains.find((d) => d.isPrimary);
      return primaryDomain?.domainName;
    }

    return evaluateSimplePath(obj, path);
  } catch (error) {
    console.warn("Failed to extract value from path:", path, error);
    return undefined;
  }
}

function evaluateTemplateFunction(obj: unknown, expression: string): unknown {
  const prefix = VALIDATION_PATTERNS.FIND_BY_PREFIX;
  if (expression.startsWith(prefix)) {
    const closing = expression.indexOf(")", prefix.length);
    if (closing !== -1) {
      const inside = expression.slice(prefix.length, closing);
      const [arrayPathRaw, propertyRaw, valueRaw] = inside.split(VALIDATION_PATTERNS.SPLIT_ARGS);
      const remainingPath = expression.slice(closing + 1).replace(/^\./, "");
      const arrayPath = arrayPathRaw.trim();
      const property = propertyRaw.replace(/^'/, "").replace(/'$/, "");
      const array = evaluateSimplePath(obj, arrayPath);

      if (Array.isArray(array)) {
        let targetValue: string | boolean = valueRaw.trim().replace(/['\"]/g, "");
        if (valueRaw.trim() === "true") {
          targetValue = true;
        } else if (valueRaw.trim() === "false") {
          targetValue = false;
        }

        const found = array.find(
          (item) =>
            hasOwnProperty(item as Record<string, unknown>, property) &&
            (item as Record<string, unknown>)[property] === targetValue,
        );

        if (found && remainingPath) {
          return evaluateSimplePath(found, remainingPath);
        }

        return found;
      }
    }
  }
  return undefined;
}

function evaluatePredicatePath(obj: unknown, path: string): unknown {
  const startBracket = path.indexOf("[");
  const endBracket = path.indexOf("]");
  const eqPos = path.indexOf("=", startBracket);
  if (startBracket === -1 || endBracket === -1 || eqPos === -1) {
    return undefined;
  }

  const arrayPath = path.slice(0, startBracket);
  const property = path.slice(startBracket + 1, eqPos);
  const valuePart = path.slice(eqPos + 1, endBracket);
  const remainingPath = path.slice(endBracket + 1).replace(/^\./, "");

  const array = evaluateSimplePath(obj, arrayPath.trim());
  if (!Array.isArray(array)) return undefined;

  let targetValue: string | boolean = valuePart.replace(/['"]/g, "");
  if (valuePart.trim() === "true") {
    targetValue = true;
  } else if (valuePart.trim() === "false") {
    targetValue = false;
  }

  const found = array.find((item) => {
    const trimmedProperty = property.trim();
    return (
      hasOwnProperty(item as Record<string, unknown>, trimmedProperty) &&
      (item as Record<string, unknown>)[trimmedProperty] === targetValue
    );
  });

  if (found && remainingPath) {
    return evaluateSimplePath(found, remainingPath.trim());
  }

  return found;
}

function evaluateSimplePath(obj: unknown, path: string): unknown {
  if (path.startsWith("$")) {
    path = path.slice(1);
    if (path.startsWith(".")) {
      path = path.slice(1);
    }
  }

  const parts = path.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;

    if (part.match(VALIDATION_PATTERNS.DIGITS_ONLY)) {
      const index = parseInt(part, 10);
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      if (hasOwnProperty(current as Record<string, unknown>, part)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }
  }

  return current;
}

function hasDomainsArray(
  obj: unknown,
): obj is { domains: Array<{ isPrimary?: boolean; domainName?: string }> } {
  return (
    hasOwnProperty(obj as Record<string, unknown>, "domains") &&
    Array.isArray((obj as { domains: unknown }).domains)
  );
}

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

export function extractMissingVariables(
  template: string,
  variables: Record<string, string>,
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
    } else {
      if (!(expression in variables) && !missing.includes(expression)) {
        missing.push(expression);
      }
    }
  }

  return missing;
}

function extractVariablesFromExpression(expression: string): string[] {
  const extractedVariables: string[] = [];

  const match = expression.match(/^(\w+)\(([^)]*?)\)$/);
  if (match) {
    const [, , argsString] = match;

    if (argsString.trim()) {
      const args = argsString.split(",").map((arg) => arg.trim());

      for (const arg of args) {
        if (
          !arg.startsWith('"') &&
          !arg.startsWith("'") &&
          !arg.includes("(") &&
          /^\w+$/.test(arg)
        ) {
          extractedVariables.push(arg);
        }
      }
    }
  }

  return extractedVariables;
}
