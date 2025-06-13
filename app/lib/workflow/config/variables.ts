import { z } from "zod";

// Local imports
import { VALIDATION_PATTERNS, WORKFLOW_CONSTANTS } from "../constants";

/**
 * Schema describing a single variable definition.  The workflow engine uses
 * this at runtime to ensure externally supplied data matches expectations.
 */
export const VariableDefinitionSchema = z.object({
  validator: z.instanceof(RegExp).optional(),
  default: z.string().optional(),
  generator: z.function().optional(),
  comment: z.string().optional(),
});

export type VariableDefinition = z.infer<typeof VariableDefinitionSchema>;

/**
 * Central catalogue of all variables referenced in the workflow.  Any new
 * variable should be added here so the engine can validate and document it.
 */
export const variableDefinitions: Record<string, VariableDefinition> = {
  // Core identifiers
  customerId: {
    validator: VALIDATION_PATTERNS.CUSTOMER_ID,
    default: "my_customer",
  },
  domainName: {
    validator: VALIDATION_PATTERNS.DOMAIN,
    comment: "Domain to be verified / provisioned within Google Admin",
  },
  primaryDomain: {
    comment: "Primary domain fetched from Google Admin API on initialization",
  },

  // OAuth tokens – injected via authentication flow
  googleAccessToken: {},
  azureAccessToken: {},

  // Google resources
  provisioningUserId: {},
  provisioningUserEmail: {},
  adminRoleId: {},
  directoryServiceId: {},
  samlProfileId: {},
  entityId: {},
  acsUrl: {},

  // Microsoft application template identifiers
  provTemplateId: {
    default: WORKFLOW_CONSTANTS.PROV_TEMPLATE_ID,
    comment:
      "Gallery ID for the Google Cloud / G Suite Connector provisioning template",
  },
  provTemplateName: {
    default: WORKFLOW_CONSTANTS.PROV_TEMPLATE_NAME,
    comment: "Display name for the provisioning application template",
  },
  ssoTemplateId: {
    default: WORKFLOW_CONSTANTS.SSO_TEMPLATE_ID,
    comment: "Gallery ID for the Google Cloud / G Suite Connector SSO template",
  },
  ssoTemplateName: {
    default: WORKFLOW_CONSTANTS.PROV_TEMPLATE_NAME,
    comment: "Display name for the SSO application template (same as prov)",
  },

  // Microsoft service principals / sync jobs etc.
  provServicePrincipalId: {},
  ssoServicePrincipalId: {},
  ssoAppId: {},
  jobId: {
    default: "Initial",
  },
  claimsPolicyId: {},
  principalId: {},

  // Other runtime data
  generatedPassword: {},
  tenantId: {
    comment: "Microsoft tenant ID from environment configuration",
  },
  rawXmlResponse: {
    comment: "Raw XML response fetched from federation metadata endpoint",
  },
  manualStepsState: {
    comment: "JSON string storing completed manual steps",
  },

  // Google OrgUnit details
  ouPath: {},
  ouName: {},
} as const;

// Fail fast on invalid definitions
Object.entries(variableDefinitions).forEach(([key, def]) => {
  try {
    VariableDefinitionSchema.parse(def);
  } catch (error) {
    throw new Error(`Invalid variable definition for ${key}: ${error}`);
  }
});
