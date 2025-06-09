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
  TEST_SSO: "Test SSO Configuration"
} as const;

export const WORKFLOW_CONSTANTS = {
  // Time constants (replacing magic numbers)
  OAUTH_STATE_TTL_MS: 600000, // 10 minutes
  TOKEN_REFRESH_BUFFER_MS: 300000, // 5 minutes
  TOKEN_COOKIE_MAX_AGE: 30 * 24 * 60 * 60, // 30 days
  
  // Size constants
  MAX_COOKIE_SIZE: 3900,
  DEFAULT_PASSWORD_LENGTH: 16,
  
  // API constants
  SYNC_INTERVAL: "PT40M", // 40 minutes in ISO 8601
  PROVISIONING_BASE_URL: "https://admin.googleapis.com/admin/directory/v1",
  
  // Special markers
  PASSWORD_EXTRACTION_KEY: "_generated_password_displayed"
};
