import { z } from "zod";

import { connections, roles, variableDefinitions } from "./config";
import {
  StepDefinition,
  StepResultSchema,
  StepContextSchema,
  WorkflowSchema,
} from "./types";

import {
  verifyPrimaryDomain,
  createAutomationOU,
  createServiceAccount,
  createCustomAdminRole,
  setupSyncPermissions,
  configureGoogleSamlProfile,
  createMicrosoftApps,
  configureMicrosoftSyncSSO,
  setupClaimsPolicy,
  completeGoogleSsoSetup,
  assignUsersToSSO,
  testSSOConfiguration,
} from "./steps";

const steps: StepDefinition[] = [
  verifyPrimaryDomain,
  createAutomationOU,
  createServiceAccount,
  createCustomAdminRole,
  setupSyncPermissions,
  configureGoogleSamlProfile,
  createMicrosoftApps,
  configureMicrosoftSyncSSO,
  setupClaimsPolicy,
  completeGoogleSsoSetup,
  assignUsersToSSO,
  testSSOConfiguration,
];

// Runtime validation of step objects to catch malformed exports
const StepArraySchema = z.array(
  z.object({
    name: z.string(),
    handler: z.function(),
  })
);

export function parseWorkflow() {
  const workflow = {
    connections,
    roles,
    variables: variableDefinitions,
    steps,
  } as const;

  WorkflowSchema.partial().parse(workflow); // structural validation
  StepArraySchema.parse(steps);

  return workflow;
}
