/** Human readable names for each workflow step. */
export const STEP_NAMES = {
  VERIFY_PRIMARY_DOMAIN: "Verify Primary Domain",
  CREATE_AUTOMATION_OU: "Create Automation Organizational Unit",
  CREATE_SERVICE_ACCOUNT: "Create Service Account for Microsoft",
  CREATE_CUSTOM_ADMIN_ROLE: "Create Custom Admin Role",
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

/**
 * Generic helper used by {@link isGoogleRole} and {@link isMicrosoftRole}.
 * Additional provider checks can reuse this without duplicating startsWith
 * logic.
 *
 * @param role - The workflow role identifier
 * @param prefixes - One or more valid prefixes
 */
function hasPrefix(role: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => role.startsWith(p));
}

// Re-implement provider helpers using the shared predicate (kept export names
// to avoid a breaking change for callers).

export function isGoogleRole(role: string): boolean {
  return hasPrefix(role, ["dir", "ci"]);
}

export function isMicrosoftRole(role: string): boolean {
  return hasPrefix(role, ["graph"]);
}

// ---------------------------------------------------------------------------
// Core time units – single source of truth for all time-based calculations.
// The numeric literals are self-descriptive; ESLint magic-number rule is
// disabled for this block.
// ---------------------------------------------------------------------------

/* eslint-disable no-magic-numbers */
export const TIME = {
  MS_IN_SECOND: 1000,
  SECONDS_IN_MINUTE: 60,
  MINUTES_IN_HOUR: 60,
  HOURS_IN_DAY: 24,
  DAYS_IN_MONTH: 30,
  MS_IN_MINUTE: 1000 * 60,
  TOKEN_EXPIRING_SOON_MINUTES: 30,
} as const;
/* eslint-enable no-magic-numbers */

// Older named exports kept as aliases to avoid widespread code churn while the
// refactor is rolled out.  They point back to the canonical TIME values so we
// still have a single definition.

export const MS_IN_SECOND = TIME.MS_IN_SECOND;
export const SECONDS_IN_MINUTE = TIME.SECONDS_IN_MINUTE;
export const MINUTES_IN_HOUR = TIME.MINUTES_IN_HOUR;
export const HOURS_IN_DAY = TIME.HOURS_IN_DAY;
export const DAYS_IN_MONTH = TIME.DAYS_IN_MONTH;

// ---------------------------------------------------------------------------
// Remote API base URLs – single source of truth to avoid duplication.
// ---------------------------------------------------------------------------

export const BASE_URLS = {
  GOOGLE_ADMIN: "https://admin.googleapis.com/admin/directory/v1",
  GOOGLE_CI: "https://cloudidentity.googleapis.com/v1",
  GRAPH_V1: "https://graph.microsoft.com/v1.0",
  GRAPH_BETA: "https://graph.microsoft.com/beta",
} as const;

// ---------------------------------------------------------------------------
// 3rd-party application template IDs & names (single definitions)
// ---------------------------------------------------------------------------

export const TEMPLATE_IDS = {
  GOOGLE_CONNECTOR: "01303a13-8322-4e06-bee5-80d612907131",
} as const;

export const TEMPLATE_NAMES = {
  GOOGLE_CONNECTOR: "Google Cloud / G Suite Connector",
} as const;

export const COPY_FEEDBACK_DURATION_MS = 2000;
export const RETRY_COUNT = 3;
export const SPLIT_LIMIT = 2;
export const JWT_PART_COUNT = 3;
export const WORKFLOW_MAX_ITERATION_MULTIPLIER = 2;
export const WILDCARD_SUFFIX_LENGTH = 2;
export const MIN_LOG_COUNT_FOR_PLURAL = 2;
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

  MAX_WORKFLOW_ITERATIONS: 2,

  MAX_COOKIE_SIZE: 3800,

  VARIABLES_COOKIE_NAME: "workflow_vars",
  VARIABLES_COOKIE_MAX_AGE:
    DAYS_IN_MONTH * HOURS_IN_DAY * MINUTES_IN_HOUR * SECONDS_IN_MINUTE,

  // Retained for backwards compatibility. Prefer SYNC_CONFIG.SYNC_INTERVAL
  SYNC_INTERVAL: "PT40M",

  // ---------------------------------------------------------------------
  // Legacy aliases – prefer TEMPLATE_IDS / TEMPLATE_NAMES going forward.
  // (Deprecated keys removed in cleanup.)
  // ---------------------------------------------------------------------
};

export const DETERMINISTIC_PASSWORD_BASE_LENGTH = 12;

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

export const ROLE_PREFIXES = {
  GOOGLE_DIR: "dir",
  GOOGLE_CI: "ci",
  MICROSOFT: "graph",
} as const;

/** Common time constants used throughout the workflow. */
/** Keys used when encoding metadata for chunked cookies. */

export const OAUTH_GRANT_TYPES = {
  AUTHORIZATION_CODE: "authorization_code",
  REFRESH_TOKEN: "refresh_token",
} as const;

export const VALIDATION_PATTERNS = {
  CUSTOMER_ID: /^C[0-9a-f]{10,}$|^my_customer$/,
  DOMAIN: /^([\w-]+\.)+[A-Za-z]{2,}$/,
  DIGITS_ONLY: /^\d+$/,
  // Removed unused patterns to reduce surface
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

// ---------------------------------------------------------------------------
//  New values introduced by the modular workflow refactor
// ---------------------------------------------------------------------------

// Duplicate constant removed – properties have been merged into the original

/**
 * Path templates (without the base URL) used by the endpoint layer.  Variable
 * placeholders are kept using curly-brace syntax for readability but the new
 * endpoint builders will perform explicit string interpolation rather than
 * blind template replacement.
 */
export const API_PATHS = {
  // NOTE: values intentionally use curly braces for readability – no unsafe
  // runtime substitution occurs because endpoint builders will explicitly
  // interpolate and validate each param.
  // Google Admin
  DOMAINS: "/customer/{customerId}/domains",
  DOMAIN_BY_NAME: "/customer/{customerId}/domains/{domainName}",
  ORG_UNITS: "/customer/{customerId}/orgunits",
  ORG_UNIT: "/customer/{customerId}/orgunits/{orgUnitPath}",
  PRIVILEGES: "/customer/{customerId}/roles/ALL/privileges",
  ROLES: "/customer/{customerId}/roles",
  ROLE: "/customer/{customerId}/roles/{roleId}",
  ROLE_ASSIGN: "/customer/{customerId}/roleassignments/{roleAssignmentId}",
  ROLE_ASSIGNMENTS: "/customer/{customerId}/roleassignments",
  USERS: "/customer/{customerId}/users",
  USER: "/customer/{customerId}/users/{userId}",

  // Google Cloud-Identity
  IDP_CERTS: "/inboundSamlSsoProfiles/{samlProfileId}:uploadCertificate",
  SAML_PROFILES: "/inboundSamlSsoProfiles",
  SAML_PROFILE: "/inboundSamlSsoProfiles/{samlProfileId}",
  SSO_ASSIGNMENTS: "/inboundSsoAssignments",

  // Microsoft Graph (v1.0 & beta)
  APP_TEMPLATES: "/applicationTemplates",
  APP_BY_TEMPLATE: "/applicationTemplates/{templateId}/instantiate",
  APP_BY_PROV_TEMPLATE:
    "/applicationTemplates/{provisioningTemplateId}/instantiate",
  APP_BY_SSO_TEMPLATE: "/applicationTemplates/{ssoTemplateId}/instantiate",
  SERVICE_PRINCIPAL: "/servicePrincipals/{servicePrincipalId}",
  SYNC_JOBS: "/servicePrincipals/{servicePrincipalId}/synchronization/jobs",
  SYNC_JOB:
    "/servicePrincipals/{servicePrincipalId}/synchronization/jobs/{jobId}",
  START_SYNC:
    "/servicePrincipals/{servicePrincipalId}/synchronization/jobs/{jobId}/start",
  CLAIMS_POLICY: "/policies/claimsMappingPolicies",
  LINK_POLICY:
    "/servicePrincipals/{servicePrincipalId}/claimsMappingPolicies/$ref",
  SAML_SETTINGS: "/applications/{appId}/federatedIdentityCredentials",
  UPDATE_SAML_SETTINGS:
    "/beta/applications/{appId}/federatedIdentityCredentials/{credentialId}",

  // Additional Microsoft Graph
  APPLICATIONS: "/applications",
  SYNC: "/servicePrincipals/{servicePrincipalId}/synchronization",
  TOKEN_POLICIES:
    "/servicePrincipals/{servicePrincipalId}/tokenIssuancePolicies",
  CREATE_TOKEN_POLICY: "/policies/tokenIssuancePolicies",
  SAML_SP_SETTINGS:
    "/servicePrincipals/{servicePrincipalId}/samlSingleSignOnSettings",

  // Additional Cloud-Identity
  IDP_CREDENTIALS: "/inboundSamlSsoProfiles/{samlProfileId}/idpCredentials",
  ADD_IDP_CREDENTIALS:
    "/inboundSamlSsoProfiles/{samlProfileId}/idpCredentials:add",

  // Additional Admin SDK
  USERS_ROOT: "/users",
  USER_BY_EMAIL: "/users/{userEmail}",

  // Public
  FED_METADATA: "/FederationMetadata/2007-06/FederationMetadata.xml",
} as const;

// ---------------------------------------------------------------------------
//  Additional constants introduced by modular workflow refactor (step files)
// ---------------------------------------------------------------------------

// Organization Units
export const OU_NAMES = { AUTOMATION: "Automation", ROOT: "/" } as const;

// Service Account Configuration
export const SERVICE_ACCOUNT = {
  USERNAME: "azuread-provisioning",
  GIVEN_NAME: "Microsoft",
  FAMILY_NAME: "Provisioning",
} as const;

// Role Configuration
export const ROLE_NAMES = {
  MS_ENTRA_PROVISIONING: "Microsoft Entra Provisioning",
  MS_ENTRA_DESC: "Custom role for Microsoft Entra provisioning service",
} as const;

// Google Workspace Privileges
export const GOOGLE_PRIVILEGES = {
  USERS_RETRIEVE: "USERS_RETRIEVE",
  USERS_CREATE: "USERS_CREATE",
  USERS_UPDATE: "USERS_UPDATE",
  GROUPS_RETRIEVE: "GROUPS_RETRIEVE",
  GROUPS_CREATE: "GROUPS_CREATE",
  ORG_UNITS_RETRIEVE: "ORG_UNITS_RETRIEVE",
} as const;

// SAML Configuration
export const SAML_CONFIG = {
  DISPLAY_NAME: "Azure AD",
  IDP_ENTITY_PREFIX: "https://sts.windows.net/",
  IDP_SSO_PREFIX: "https://login.microsoftonline.com/",
  SSO_MODE_SAML: "SAML_SSO",
  SSO_MODE_OFF: "SSO_OFF",
} as const;

// Microsoft Graph Configuration
export const MS_GRAPH_CONFIG = {
  GOOGLE_CONNECTOR_TEMPLATE_ID: TEMPLATE_IDS.GOOGLE_CONNECTOR,
  GOOGLE_CONNECTOR_NAME: TEMPLATE_NAMES.GOOGLE_CONNECTOR,
  CLAIMS_POLICY_NAME: "Google Workspace Basic Claims",
  CLAIMS_POLICY_VERSION: 1,
  BASE_ADDRESS_KEY: "BaseAddress",
  SECRET_KEY_KEY: "SecretKey",
  GOOGLE_ADMIN_BASE: BASE_URLS.GOOGLE_ADMIN,
  GRAPH_BETA_BASE: BASE_URLS.GRAPH_BETA,
} as const;

// Sync Job Configuration
export const SYNC_CONFIG = {
  DEFAULT_JOB_ID: "Initial",
  SYNC_INTERVAL: "PT40M",
} as const;

// Password Generation
export const PASSWORD_CONFIG = {
  DEFAULT_LENGTH: 16,
  DETERMINISTIC_SUFFIX: "-azuread-provisioning-2024",
} as const;

// Miscellaneous repeated literals
export const GOOGLE_GROUPS = { ALL_USERS: "allUsers" } as const;
