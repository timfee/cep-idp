import { z } from "zod";

// Local imports
import {
  TEMPLATE_IDS,
  TEMPLATE_NAMES,
  VALIDATION_PATTERNS,
} from "../constants";

/**
 * Schema describing a single variable definition.  The workflow engine uses
 * this at runtime to ensure externally supplied data matches expectations.
 */
export const VariableDefinitionSchema = z.object({
  validator: z.union([z.instanceof(RegExp), z.string()]).optional(),
  default: z.string().optional(),
  generator: z.string().optional(),
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
    validator: "domain",
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
  provisioningTemplateId: {
    default: TEMPLATE_IDS.GOOGLE_CONNECTOR,
    comment:
      "Gallery ID for the Google Cloud / G Suite Connector provisioning template",
  },
  provisioningTemplateName: {
    default: TEMPLATE_NAMES.GOOGLE_CONNECTOR,
    comment: "Display name for the provisioning application template",
  },
  ssoTemplateId: {
    default: TEMPLATE_IDS.GOOGLE_CONNECTOR,
    comment: "Gallery ID for the Google Cloud / G Suite Connector SSO template",
  },
  ssoTemplateName: {
    default: TEMPLATE_NAMES.GOOGLE_CONNECTOR,
    comment: "Display name for the SSO application template (same as prov)",
  },

  // Microsoft service principals / sync jobs etc.
  provisioningServicePrincipalId: {},
  ssoServicePrincipalId: {},
  ssoAppId: {},
  jobId: { default: "Initial" },
  claimsPolicyId: {},

  // Other runtime data
  generatedPassword: {},
  tenantId: { comment: "Microsoft tenant ID from environment configuration" },

  // Local JSON string that tracks completion of manual workflow steps.  Used
  // solely by the UI layer; not required for API calls.
  manualStepsState: {},
  // Google OrgUnit details (removed unused ouPath/ouName variables)
} as const;

// Fail fast on invalid definitions
Object.entries(variableDefinitions).forEach(([key, def]) => {
  try {
    VariableDefinitionSchema.parse(def);
  } catch (error) {
    throw new Error(`Invalid variable definition for ${key}: ${error}`);
  }
});
