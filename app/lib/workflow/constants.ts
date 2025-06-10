export const STEP_NAMES = {
  VERIFY_PRIMARY_DOMAIN: "Verify Primary Domain",
  CREATE_AUTOMATION_OU: "Create Automation Organizational Unit",
  CREATE_SERVICE_ACCOUNT: "Create Service Account for Microsoft",
  CREATE_ADMIN_ROLE: "Create Custom Admin Role",
  ASSIGN_ROLE: "Assign Admin Role to Service Account",
  CREATE_SAML_PROFILE: "Create SAML Profile for SSO",
  ADD_IDP_CERTIFICATE: "Add Microsoft Identity Certificate",
  CREATE_PROVISIONING_APP: "Create Microsoft Provisioning App",
  CONFIGURE_PROVISIONING: "Configure User Provisioning",
  START_SYNC: "Start User Synchronization",
  CREATE_SSO_APP: "Create Microsoft SSO App",
  CONFIGURE_SAML: "Configure SAML Settings",
  CREATE_CLAIMS_POLICY: "Create Claims Mapping Policy",
  ASSIGN_USERS_TO_SSO: "Assign Users to SSO App",
  ENABLE_SSO_ROOT: "Enable SSO for Organization",
  DISABLE_SSO_AUTOMATION: "Disable SSO for Service Accounts",
  TEST_SSO: "Test SSO Configuration",
} as const;

// Provider constants
export const PROVIDERS = {
  GOOGLE: "google",
  MICROSOFT: "microsoft",
} as const;
export type Provider = (typeof PROVIDERS)[keyof typeof PROVIDERS];

// Status values
export const STATUS_VALUES = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;

// Role prefix helpers
export function isGoogleRole(role: string): boolean {
  return role.startsWith("dir") || role.startsWith("ci");
}

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
  // Time constants (replacing magic numbers)
  OAUTH_STATE_TTL_MS:
    DAYS_IN_MONTH *
    HOURS_IN_DAY *
    MINUTES_IN_HOUR *
    SECONDS_IN_MINUTE *
    MS_IN_SECOND,
  TOKEN_REFRESH_BUFFER_MS: 300000, // 5 minutes
  TOKEN_COOKIE_MAX_AGE:
    DAYS_IN_MONTH * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE, // 30 days

  // HTTP Status codes
  HTTP_STATUS: {
    UNAUTHORIZED: 401,
    NOT_FOUND: 404,
  },

  // Cognitive limits
  MAX_COGNITIVE_COMPLEXITY: 20,
  MAX_FUNCTION_UPDATES: 4,

  // UI Constants
  ANIMATION_DURATION_MS: 2000,
  DEBOUNCE_DELAY_MS: 300,

  // String processing
  MIN_PASSWORD_LENGTH: 16,
  JSONPATH_SINGLE_RESULT: 1,
  STRING_SPLIT_PAIR: 2,

  // Iteration limits
  MAX_WORKFLOW_ITERATIONS: 2,

  // Size constants
  MAX_COOKIE_SIZE: 3800,

  // Cookie names and TTL
  VARIABLES_COOKIE_NAME: "workflow_vars",
  VARIABLES_COOKIE_MAX_AGE:
    DAYS_IN_MONTH * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE,

  // API constants
  SYNC_INTERVAL: "PT40M", // 40 minutes in ISO 8601
  PROVISIONING_BASE_URL: "https://admin.googleapis.com/admin/directory/v1",

  // Special markers
  PASSWORD_EXTRACTION_KEY: "_generated_password_displayed",
};

export const VARIABLE_KEYS = {
  GENERATED_PASSWORD: "generatedPassword",
  TENANT_ID: "tenantId",
  PRIMARY_DOMAIN: "primaryDomain",
} as const;
