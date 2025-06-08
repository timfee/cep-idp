import { randomBytes } from 'crypto';

export function generatePassword(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const bytes = randomBytes(length);
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

export function evaluateGenerator(generator: string): string {
  // Handle randomPassword(n) generator
  const passwordMatch = generator.match(/randomPassword\((\d+)\)/);
  if (passwordMatch) {
    return generatePassword(parseInt(passwordMatch[1]));
  }

  throw new Error(`Unknown generator: ${generator}`);
}

export function substituteVariables(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{([^}]+)\}/g, (match, varName) => {
    if (varName in variables) {
      return variables[varName];
    }
    throw new Error(`Variable ${varName} not found`);
  });
}

export function substituteObject(
  obj: unknown,
  variables: Record<string, string>
): unknown {
  if (typeof obj === 'string') {
    return substituteVariables(obj, variables);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => substituteObject(item, variables));
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteObject(value, variables);
    }
    return result;
  }

  return obj;
}

export function extractValueFromPath(obj: unknown, path: string): unknown {
  // Handle JSONPath-like syntax ($.field.subfield)
  if (path.startsWith('$.')) {
    path = path.substring(2);
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

export function validateVariable(value: string, validator?: string): boolean {
  if (!validator) return true;

  try {
    const regex = new RegExp(validator);
    return regex.test(value);
  } catch (error) {
    console.error('Invalid regex validator:', validator, error);
    return false;
  }
}
