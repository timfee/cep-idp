/** Human readable names for each workflow step. */
export const STEP_NAMES = {
  VERIFY_PRIMARY_DOMAIN: "Verify Primary Domain",
  CREATE_AUTOMATION_OU: "Create Automation Organizational Unit",
  CREATE_SERVICE_ACCOUNT: "Create Service Account for Microsoft",
  SETUP_SYNC_PERMISSIONS: "Setup Microsoft Sync Permissions",
  CONFIGURE_GOOGLE_SAML_PROFILE: "Configure Google SAML Profile",
  CREATE_MICROSOFT_APPS: "Create Microsoft Apps",
  CONFIGURE_MICROSOFT_SYNC_SSO: "Configure Microsoft Sync and SSO",
  SETUP_CLAIMS_POLICY: "Setup Microsoft Claims Policy",
  COMPLETE_GOOGLE_SSO_SETUP: "Complete Google SSO Setup",
  ASSIGN_USERS_TO_SSO: "Assign Users to SSO App",
  TEST_SSO: "Test SSO Configuration",
} as const;

/** OAuth providers supported by the workflow. */
export const PROVIDERS = { GOOGLE: "google", MICROSOFT: "microsoft" } as const;
export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

/** Possible run states for a workflow step. */
export const STATUS_VALUES = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

/**
 * Determine if a role belongs to the Google API group.
 *
 * @param role - Role identifier from workflow
 * @returns True when role targets Google APIs
 */
export function isGoogleRole(role: string): boolean {
  return role.startsWith("dir") || role.startsWith("ci");
}

/**
 * Determine if a role targets Microsoft Graph APIs.
 *
 * @param role - Role identifier from workflow
 * @returns True when role targets Microsoft Graph
 */
export function isMicrosoftRole(role: string): boolean {
  return role.startsWith("graph");
}

export const HOURS_IN_DAY = 24;
export const DAYS_IN_MONTH = 30;
export const MINUTES_IN_HOUR = 60;
export const SECONDS_IN_MINUTE = 60;
export const MS_IN_SECOND = 1000;
export const COPY_FEEDBACK_DURATION_MS = 2000;
export const RETRY_COUNT = 3;
export const SPLIT_LIMIT = 2;
export const JWT_PART_COUNT = 3;
export const WORKFLOW_MAX_ITERATION_MULTIPLIER = 2;
export const STRING_SPLIT_PAIR = 2;
export const WILDCARD_SUFFIX_LENGTH = 2;
export const MIN_LOG_COUNT_FOR_PLURAL = 2;
export const EXPECTED_ARG_COUNT_PAIR = 2;
export const CRYPTO_IV_LENGTH_BYTES = 16;
export const CRYPTO_AUTH_TAG_SPLIT_INDEX = 2;
export const CRYPTO_RANDOM_BYTES_LENGTH = 32;
export const VARIABLE_DISPLAY_MAX_LENGTH = 20;

export const COOKIE_METADATA_SIZES = {
  PATH: 7,
  MAX_AGE: 9,
  SAME_SITE: 11,
  HTTP_ONLY: 10,
  SECURE: 8,
  DOMAIN: 9,
} as const;

export const WORKFLOW_CONSTANTS = {
  MAX_REFRESH_ATTEMPTS: 2,
  OAUTH_STATE_TTL_MS:
    DAYS_IN_MONTH
    * HOURS_IN_DAY
    * MINUTES_IN_HOUR
    * SECONDS_IN_MINUTE
    * MS_IN_SECOND,
  /** Five minutes */
  TOKEN_REFRESH_BUFFER_MS: 300000,
  TOKEN_COOKIE_MAX_AGE:
    DAYS_IN_MONTH * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE,
  /** HTTP Status codes used when calling APIs */
  HTTP_STATUS: { UNAUTHORIZED: 401, NOT_FOUND: 404 },

  MAX_FUNCTION_UPDATES: 4,

  ANIMATION_DURATION_MS: 2000,
  DEBOUNCE_DELAY_MS: 300,

  MIN_PASSWORD_LENGTH: 16,
  JSONPATH_SINGLE_RESULT: 1,
  STRING_SPLIT_PAIR: 2,

  MAX_WORKFLOW_ITERATIONS: 2,

  MAX_COOKIE_SIZE: 3800,

  VARIABLES_COOKIE_NAME: "workflow_vars",
  VARIABLES_COOKIE_MAX_AGE:
    DAYS_IN_MONTH * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE,

  SYNC_INTERVAL: "PT40M",
  PROVISIONING_BASE_URL: "https://admin.googleapis.com/admin/directory/v1",

  PASSWORD_EXTRACTION_KEY: "_generated_password_displayed",
};

export const OAUTH_STATE_COOKIE_NAME = "oauth_state";

export const VARIABLE_KEYS = {
  GENERATED_PASSWORD: "generatedPassword",
  TENANT_ID: "tenantId",
  PRIMARY_DOMAIN: "primaryDomain",
} as const;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
} as const;

export type HttpMethod = (typeof HTTP_METHODS)[keyof typeof HTTP_METHODS];

export const HTTP_METHODS_WITH_BODY = [
  HTTP_METHODS.POST,
  HTTP_METHODS.PATCH,
  HTTP_METHODS.PUT,
] as const;

export const ROLE_PREFIXES = {
  GOOGLE_DIR: "dir",
  GOOGLE_CI: "ci",
  MICROSOFT: "graph",
} as const;

export const CONNECTION_IDENTIFIERS = {
  GOOGLE: "google",
  GOOGLE_CI: "CI",
  MICROSOFT: "graph",
} as const;

export const LOG_LEVELS = {
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
} as const;
export type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

/** Common time constants used throughout the workflow. */
export const TIME = {
  MS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  MS_IN_MINUTE: 60000,
  TOKEN_EXPIRING_SOON_MINUTES: 30,
} as const;

/** Keys used when encoding metadata for chunked cookies. */
export const COOKIE_METADATA_KEYS = {
  CHUNKED: "chunked",
  COUNT: "count",
  TIMESTAMP: "timestamp",
} as const;

export const CHECKER_TYPES = {
  EXISTS: "exists",
  FIELD_TRUTHY: "fieldTruthy",
  EQ: "eq",
} as const;

export const OAUTH_GRANT_TYPES = {
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
} as const;

export const VALIDATION_PATTERNS = {
  CUSTOMER_ID: /^C[0-9a-f]{10,}$|^my_customer$/,
  DOMAIN: /^([\w-]+\.)+[A-Za-z]{2,}$/,
  DIGITS_ONLY: /^\d+$/,
  FIND_BY_PREFIX: "findBy(",
  SPLIT_ARGS: /,\s*/,
} as const;

export const ERROR_MESSAGES = {
  ENDPOINT_NOT_FOUND: (endpoint: string) => `Endpoint not found: ${endpoint}`,
  MISSING_INPUTS: (stepName: string, inputs: string[]) =>
    `Cannot execute "${stepName}". Missing required data: ${inputs.join(", ")}. Please complete the previous steps first.`,
  UNKNOWN_GENERATOR: (generator: string) => `Unknown generator: ${generator}`,
  VARIABLE_NOT_FOUND: (variable: string) => `Variable ${variable} not found`,
  AUTH_EXPIRED: (provider: string) =>
    `${provider} authentication expired. Please re-authenticate.`,
  RESOURCE_NOT_FOUND: (stepName: string) =>
    `Resource not found for "${stepName}". This usually means a previous step failed to create the required resource.`,
} as const;

export const JSON_FORMAT = { INDENT: 2, DATE_LOCALE: "en-US" } as const;
