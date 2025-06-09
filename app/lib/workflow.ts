import { z } from "zod";
import { randomBytes } from 'crypto';
import { JSONPath } from 'jsonpath-plus';

// ============================================================================
// TYPES
// ============================================================================

export const VariableSchema = z.object({
  validator: z.string().optional(),
  generator: z.string().optional(),
  default: z.string().optional(),
});

export const ActionSchema = z.object({
  use: z.string(),
  checker: z.string().optional(),
  field: z.string().optional(),
  value: z.string().optional(),
  jsonPath: z.string().optional(),
  payload: z.record(z.any()).optional(),
  extract: z.record(z.string()).optional(),
  longRunning: z.boolean().optional(),
  fallback: z.boolean().optional(),
});

export const StepSchema = z.object({
  name: z.string(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  actions: z.array(ActionSchema).optional(),
  role: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  manual: z.boolean().optional(),
  apiStatus: z.string().optional(),
});

export const EndpointSchema = z.object({
  conn: z.string(),
  method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  path: z.string(),
  qs: z.record(z.string()).optional(),
});

export const ConnectionSchema = z.object({
  base: z.string(),
  auth: z.string(),
});

export const WorkflowSchema = z.object({
  connections: z.record(ConnectionSchema),
  roles: z.record(z.array(z.string())),
  endpoints: z.record(EndpointSchema),
  checkers: z.record(z.string()),
  variables: z.record(VariableSchema),
  steps: z.array(StepSchema),
});

export const TokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.array(z.string()),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Endpoint = z.infer<typeof EndpointSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Token = z.infer<typeof TokenSchema>;

export interface WorkflowState {
  variables: Record<string, string>;
  stepStatus: Record<string, StepStatus>;
}

export interface StepStatus {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string;
  result?: unknown;
  logs: LogEntry[];
  startedAt?: number;
  completedAt?: number;
  variables?: Record<string, string>;
}

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}

// ============================================================================
// WORKFLOW PARSING
// ============================================================================

export function parseWorkflow(): Workflow {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const workflow = require("../../workflow.json");
    return WorkflowSchema.parse(workflow);
  } catch (error) {
    console.error("Failed to parse workflow:", error);
    throw new Error("Invalid workflow configuration");
  }
}

// ============================================================================
// VARIABLE UTILITIES
// ============================================================================

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
    
    if (expression in variables) {
      return variables[expression];
    }
    
    if (options.throwOnMissing) {
      throw new Error(`Variable ${expression} not found`);
    }
    
    console.warn(`Variable ${expression} not found, keeping placeholder`);
    return match;
  });
}

function evaluateTemplateExpression(
  expression: string,
  variables: Record<string, string>
): string {
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
    
    case 'generatePassword': {
      if (args.length !== 1) {
        throw new Error('generatePassword() requires exactly 1 argument: length');
      }
      const length = parseInt(args[0], 10);
      if (isNaN(length) || length <= 0) {
        throw new Error('generatePassword() length must be a positive number');
      }
      return generatePassword(length);
    }
    
    default:
      throw new Error(`Unknown template function: ${functionName}`);
  }
}

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

function resolveTemplateArg(
  arg: string,
  variables: Record<string, string>
): string {
  if ((arg.startsWith('"') && arg.endsWith('"')) || 
      (arg.startsWith("'") && arg.endsWith("'"))) {
    return arg.slice(1, -1);
  }
  
  if (arg in variables) {
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
    return '%s';
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

export function extractValueFromPath(obj: unknown, path: string): unknown {
  if (!obj || !path) return undefined;

  try {
    if (path.startsWith('$') || path.includes('[?(') || path.includes('[*]')) {
      const results = JSONPath({ path, json: obj, wrap: false });
      
      if (Array.isArray(results)) {
        if (results.length === 1 && !path.includes('[*]') && !path.includes('..')) {
          return results[0];
        } else if (results.length === 0) {
          return undefined;
        } else {
          return results;
        }
      }
      
      return results;
    }

    if (path.includes('findBy(')) {
      return evaluateTemplateFunction(obj, path);
    }

    if (path.includes('[') && path.includes('=')) {
      return evaluatePredicatePath(obj, path);
    }

    if (path === 'primaryDomain' && hasDomainsArray(obj)) {
      const data = obj as { domains: Array<{ isPrimary?: boolean; domainName?: string }> };
      const primaryDomain = data.domains.find(d => d.isPrimary);
      return primaryDomain?.domainName;
    }

    return evaluateSimplePath(obj, path);
  } catch (error) {
    console.warn('Failed to extract value from path:', path, error);
    return undefined;
  }
}

function evaluateTemplateFunction(obj: unknown, expression: string): unknown {
  const findByMatch = expression.match(/findBy\(([^,]+),\s*'([^']+)',\s*([^)]+)\)\.?(.*)$/);
  
  if (findByMatch) {
    const [, arrayPath, property, value, remainingPath] = findByMatch;
    const array = evaluateSimplePath(obj, arrayPath.trim());
    
    if (Array.isArray(array)) {
      const targetValue = value.trim() === 'true' ? true : 
                         value.trim() === 'false' ? false : 
                         value.replace(/['"]/g, '');
      
      const found = array.find((item: unknown) => {
        return item && 
               typeof item === 'object' && 
               item !== null && 
               property in item &&
               (item as Record<string, unknown>)[property] === targetValue;
      });
      
      if (found && remainingPath) {
        return evaluateSimplePath(found, remainingPath);
      }
      
      return found;
    }
  }
  
  return undefined;
}

function evaluatePredicatePath(obj: unknown, path: string): unknown {
  const predicateMatch = path.match(/^([^[]+)\[([^=]+)=([^\]]+)\]\.?(.*)$/);
  
  if (predicateMatch) {
    const [, arrayPath, property, value, remainingPath] = predicateMatch;
    const array = evaluateSimplePath(obj, arrayPath.trim());
    
    if (Array.isArray(array)) {
      const targetValue = value.trim() === 'true' ? true : 
                         value.trim() === 'false' ? false : 
                         value.replace(/['"]/g, '');
      
      const found = array.find((item: unknown) => {
        const trimmedProperty = property.trim();
        return item && 
               typeof item === 'object' && 
               item !== null && 
               trimmedProperty in item &&
               (item as Record<string, unknown>)[trimmedProperty] === targetValue;
      });
      
      if (found && remainingPath) {
        return evaluateSimplePath(found, remainingPath.trim());
      }
      
      return found;
    }
  }
  
  return undefined;
}

function evaluateSimplePath(obj: unknown, path: string): unknown {
  if (path.startsWith('$.')) {
    path = path.substring(2);
  }

  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null) return undefined;
    
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

function hasDomainsArray(obj: unknown): obj is { domains: Array<{ isPrimary?: boolean; domainName?: string }> } {
  return obj != null && 
         typeof obj === 'object' && 
         'domains' in obj && 
         Array.isArray((obj as Record<string, unknown>).domains);
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

// ============================================================================
// CHECKER UTILITIES
// ============================================================================

export function evaluateChecker(
  checker: { checker?: string; field?: string; value?: string; jsonPath?: string },
  response: unknown,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _variables: Record<string, string>
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

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function extractMissingVariables(
  template: string,
  variables: Record<string, string>
): string[] {
  const missing: string[] = [];
  
  const matches = template.matchAll(/\{([^}]+)\}/g);
  
  for (const match of matches) {
    const expression = match[1];
    
    if (expression.includes('(')) {
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
  
  const match = expression.match(/^(\w+)\((.*)\)$/);
  if (match) {
    const [, , argsString] = match;
    
    if (argsString.trim()) {
      // Simple parsing - split by comma and check for unquoted arguments
      const args = argsString.split(',').map(arg => arg.trim());
      
      for (const arg of args) {
        // Skip quoted strings, keep variable names
        if (!arg.startsWith('"') && !arg.startsWith("'") && 
            !arg.includes('(') && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg)) {
          extractedVariables.push(arg);
        }
      }
    }
  }
  
  return extractedVariables;
}