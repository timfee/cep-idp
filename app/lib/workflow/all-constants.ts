// Comprehensive constants for workflow

// HTTP Constants
export const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE',
} as const;

export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];

export const HTTP_METHODS_WITH_BODY = [
  HTTP_METHODS.POST,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.PUT,
] as const;

// Provider detection
export const ROLE_PREFIXES = {
  GOOGLE_DIR: 'dir',
  GOOGLE_CI: 'ci',
  MICROSOFT: 'graph',
} as const;

export const CONNECTION_IDENTIFIERS = {
  GOOGLE: 'google',
  GOOGLE_CI: 'CI',
  MICROSOFT: 'graph',
} as const;

// Password generation
export const PASSWORD_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
export const PASSWORD_GENERATOR_REGEX = /randomPassword\((\d+)\)/;

// Log levels
export const LOG_LEVELS = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;
export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

// Time constants
export const TIME = {
  MS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  MS_IN_MINUTE: 60000,
  TOKEN_EXPIRING_SOON_MINUTES: 30,
} as const;

// Cookie metadata keys
export const COOKIE_METADATA_KEYS = {
  CHUNKED: 'chunked',
  COUNT: 'count',
  TIMESTAMP: 'timestamp',
} as const;

// Checker types
export const CHECKER_TYPES = {
  EXISTS: 'exists',
  FIELD_TRUTHY: 'fieldTruthy',
  EQ: 'eq',
} as const;

// OAuth grant types
export const OAUTH_GRANT_TYPES = {
  AUTHORIZATION_CODE: 'authorization_code',
  REFRESH_TOKEN: 'refresh_token',
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  CUSTOMER_ID: /^C[0-9a-f]{10,}$|^my_customer$/,
  DOMAIN: /^([\w-]+\.)+[A-Za-z]{2,}$/,
  DIGITS_ONLY: /^\d+$/,
  FIND_BY_PREFIX: 'findBy(',
  SPLIT_ARGS: /,\s*/,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  ENDPOINT_NOT_FOUND: (endpoint: string) => `Endpoint not found: ${endpoint}`,
  MISSING_INPUTS: (stepName: string, inputs: string[]) =>
    `Cannot execute "${stepName}". Missing required data: ${inputs.join(", ")}. Please complete the previous steps first.`,
  UNKNOWN_GENERATOR: (generator: string) => `Unknown generator: ${generator}`,
  VARIABLE_NOT_FOUND: (variable: string) => `Variable ${variable} not found`,
  AUTH_EXPIRED: (provider: string) => `${provider} authentication expired. Please re-authenticate.`,
  RESOURCE_NOT_FOUND: (stepName: string) =>
    `Resource not found for "${stepName}". This usually means a previous step failed to create the required resource.`,
} as const;

// JSON formatting
export const JSON_FORMAT = {
  INDENT: 2,
  DATE_LOCALE: 'en-US',
} as const;
