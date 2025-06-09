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
  variables: Record<string, string>,
  options: { throwOnMissing?: boolean } = {}
): string {
  return template.replace(/\{([^}]+)\}/g, (match, expression) => {
    // Handle template functions (e.g., concat, format)
    if (expression.includes('(')) {
      try {
        return evaluateTemplateExpression(expression, variables);
      } catch (error) {
        if (options.throwOnMissing) {
          throw error;
        }
        console.warn(`Template expression failed: ${expression}`, error);
        return match;
      }
    }
    
    // Handle simple variable substitution
    if (expression in variables) {
      return variables[expression];
    }
    
    if (options.throwOnMissing) {
      throw new Error(`Variable ${expression} not found`);
    }
    
    // Return the original placeholder if variable not found
    console.warn(`Variable ${expression} not found, keeping placeholder`);
    return match;
  });
}

/**
 * Evaluates template expressions like concat(), format(), etc.
 * 
 * Supported functions:
 * - concat(arg1, arg2, ...) - Concatenates arguments
 * - format(template, arg1, arg2, ...) - String formatting with %s placeholders
 * - email(username, domain) - Creates email address
 * - url(base, path) - Combines URL parts
 */
function evaluateTemplateExpression(
  expression: string,
  variables: Record<string, string>
): string {
  // Parse function call: functionName(arg1, arg2, ...)
  const match = expression.match(/^(\w+)\((.*)\)$/);
  if (!match) {
    throw new Error(`Invalid template expression: ${expression}`);
  }
  
  const [, functionName, argsString] = match;
  const args = parseTemplateArgs(argsString, variables);
  
  switch (functionName) {
    case 'concat':
      return args.join('');
      
    case 'format': {
      if (args.length === 0) {
        throw new Error('format() requires at least one argument');
      }
      const template = args[0];
      const values = args.slice(1);
      return formatString(template, values);
    }
    
    case 'email': {
      if (args.length !== 2) {
        throw new Error('email() requires exactly 2 arguments: username and domain');
      }
      return `${args[0]}@${args[1]}`;
    }
    
    case 'url': {
      if (args.length !== 2) {
        throw new Error('url() requires exactly 2 arguments: base and path');
      }
      const base = args[0].replace(/\/$/, '');
      const path = args[1].replace(/^\//, '');
      return `${base}/${path}`;
    }
    
    default:
      throw new Error(`Unknown template function: ${functionName}`);
  }
}

/**
 * Parses template function arguments, handling quoted strings and variable references
 */
function parseTemplateArgs(
  argsString: string,
  variables: Record<string, string>
): string[] {
  if (!argsString.trim()) {
    return [];
  }
  
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  
  for (let i = 0; i < argsString.length; i++) {
    const char = argsString[i];
    
    if (!inQuotes && (char === '"' || char === "'")) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar) {
      inQuotes = false;
      quoteChar = '';
    } else if (!inQuotes && char === ',') {
      args.push(resolveTemplateArg(current.trim(), variables));
      current = '';
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
 * Resolves a single template argument (variable reference or literal string)
 */
function resolveTemplateArg(
  arg: string,
  variables: Record<string, string>
): string {
  // Handle quoted strings
  if ((arg.startsWith('"') && arg.endsWith('"')) || 
      (arg.startsWith("'") && arg.endsWith("'"))) {
    return arg.slice(1, -1);
  }
  
  // Handle variable references
  if (arg in variables) {
    return variables[arg];
  }
  
  // Treat as literal string
  return arg;
}

/**
 * Simple string formatting with %s placeholders
 */
function formatString(template: string, values: string[]): string {
  let result = template;
  let valueIndex = 0;
  
  result = result.replace(/%s/g, () => {
    if (valueIndex < values.length) {
      return values[valueIndex++];
    }
    return '%s'; // Keep placeholder if no more values
  });
  
  return result;
}

export function substituteObject(
  obj: unknown,
  variables: Record<string, string>,
  options: { throwOnMissing?: boolean } = {}
): unknown {
  if (typeof obj === 'string') {
    return substituteVariables(obj, variables, options);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => substituteObject(item, variables, options));
  }

  if (obj && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = substituteObject(value, variables, options);
    }
    return result;
  }

  return obj;
}

import { JSONPath } from 'jsonpath-plus';

/**
 * Enhanced path expression evaluator that supports multiple expression formats for flexible data extraction.
 * 
 * Supported formats:
 * 
 * 1. **JSONPath expressions** (most powerful):
 *    - `$.domains[?(@.isPrimary)].domainName` - Find domain where isPrimary is true, get domainName
 *    - `$.users[?(@.role === 'admin')].email` - Find users with admin role, get their emails
 *    - `$.items[*].name` - Get all item names as array
 *    - `$..name` - Get all name properties recursively
 * 
 * 2. **Template functions** (readable and intuitive):
 *    - `findBy(domains, 'isPrimary', true).domainName` - Find by property value
 *    - `findBy(users, 'status', 'active').email` - Find active user's email
 * 
 * 3. **Predicate syntax** (concise filtering):
 *    - `domains[isPrimary=true].domainName` - Find domain where isPrimary equals true
 *    - `users[role=admin].email` - Find user where role equals admin
 *    - `items[status=active].name` - Find active items
 * 
 * 4. **Simple dot notation** (traditional property access):
 *    - `user.profile.email` - Navigate nested objects
 *    - `domains.0.domainName` - Access array elements by index
 *    - `response.data.items` - Standard property traversal
 * 
 * 5. **Special cases** (legacy compatibility):
 *    - `primaryDomain` - Shorthand for finding primary domain in domains array
 * 
 * @example
 * // JSONPath: Find primary domain
 * extractValueFromPath(response, '$.domains[?(@.isPrimary)].domainName')
 * 
 * @example  
 * // Template function: Find admin user
 * extractValueFromPath(data, "findBy(users, 'role', 'admin').email")
 * 
 * @example
 * // Predicate: Find verified domain
 * extractValueFromPath(response, 'domains[verified=true].domainName')
 * 
 * @param obj - The object to extract data from
 * @param path - The path expression (any of the supported formats)
 * @returns The extracted value, or undefined if not found
 */
export function extractValueFromPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  try {
    // Handle JSONPath expressions (starting with $ or containing filters)
    if (path.startsWith('$') || path.includes('[?(') || path.includes('[*]')) {
      const results = JSONPath({ path, json: obj, wrap: false });
      return Array.isArray(results) && results.length === 1 ? results[0] : results;
    }

    // Handle template functions like findBy(domains, 'isPrimary', true).domainName
    if (path.includes('findBy(')) {
      return evaluateTemplateFunction(obj, path);
    }

    // Handle predicate syntax like domains[isPrimary=true].domainName
    if (path.includes('[') && path.includes('=')) {
      return evaluatePredicatePath(obj, path);
    }

    // Handle special case for primary domain extraction
    if (path === 'primaryDomain' && hasDomainsArray(obj)) {
      const data = obj as { domains: Array<{ isPrimary?: boolean; domainName?: string }> };
      const primaryDomain = data.domains.find(d => d.isPrimary);
      return primaryDomain?.domainName;
    }

    // Fall back to simple dot notation
    return evaluateSimplePath(obj, path);
  } catch (error) {
    console.warn('Failed to extract value from path:', path, error);
    return undefined;
  }
}

/**
 * Evaluates template functions like findBy(array, property, value)
 */
function evaluateTemplateFunction(obj: unknown, expression: string): unknown {
  const findByMatch = expression.match(/findBy\(([^,]+),\s*'([^']+)',\s*([^)]+)\)\.?(.*)$/);
  
  if (findByMatch) {
    const [, arrayPath, property, value, remainingPath] = findByMatch;
    const array = evaluateSimplePath(obj, arrayPath.trim());
    
    if (Array.isArray(array)) {
      const targetValue = value.trim() === 'true' ? true : 
                         value.trim() === 'false' ? false : 
                         value.replace(/['"]/g, '');
      
      const found = array.find((item: any) => item && item[property] === targetValue);
      
      if (found && remainingPath) {
        return evaluateSimplePath(found, remainingPath);
      }
      
      return found;
    }
  }
  
  return undefined;
}

/**
 * Evaluates predicate paths like domains[isPrimary=true].domainName
 */
function evaluatePredicatePath(obj: unknown, path: string): unknown {
  const predicateMatch = path.match(/^([^[]+)\[([^=]+)=([^\]]+)\]\.?(.*)$/);
  
  if (predicateMatch) {
    const [, arrayPath, property, value, remainingPath] = predicateMatch;
    const array = evaluateSimplePath(obj, arrayPath.trim());
    
    if (Array.isArray(array)) {
      const targetValue = value.trim() === 'true' ? true : 
                         value.trim() === 'false' ? false : 
                         value.replace(/['"]/g, '');
      
      const found = array.find((item: any) => item && item[property.trim()] === targetValue);
      
      if (found && remainingPath) {
        return evaluateSimplePath(found, remainingPath.trim());
      }
      
      return found;
    }
  }
  
  return undefined;
}

/**
 * Evaluates simple dot notation paths
 */
function evaluateSimplePath(obj: unknown, path: string): unknown {
  // Handle JSONPath-like syntax ($.field.subfield)
  if (path.startsWith('$.')) {
    path = path.substring(2);
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    
    // Handle array indices
    if (part.match(/^\d+$/)) {
      const index = parseInt(part, 10);
      if (Array.isArray(current)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

/**
 * Type guard to check if object has domains array
 */
function hasDomainsArray(obj: unknown): obj is { domains: Array<any> } {
  return obj != null && 
         typeof obj === 'object' && 
         'domains' in obj && 
         Array.isArray((obj as any).domains);
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
