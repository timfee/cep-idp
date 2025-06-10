import { JSONPath } from "jsonpath-plus";
import { VALIDATION_PATTERNS } from "./constants";
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
      const [arrayPathRaw, propertyRaw, valueRaw] = inside.split(
        VALIDATION_PATTERNS.SPLIT_ARGS,
      );
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

export { evaluateTemplateFunction, evaluatePredicatePath, evaluateSimplePath, hasDomainsArray };
