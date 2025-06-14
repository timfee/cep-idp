import { z } from "zod";

import { connections, roles, variableDefinitions } from "./config";
import {
  assignUsersToSSO,
  completeGoogleSsoSetup,
  configureGoogleSamlProfile,
  configureMicrosoftSyncSSO,
  createAutomationOU,
  createCustomAdminRole,
  createMicrosoftApps,
  createServiceAccount,
  setupClaimsPolicy,
  setupSyncPermissions,
  testSSOConfiguration,
  verifyPrimaryDomain,
} from "./steps";
import { StepDefinition } from "./types";

// Ordered list of workflow steps (typed handlers)
export const steps: StepDefinition[] = [
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

// Basic runtime validation – ensure each step exposes name & handler
const StepArraySchema = z.array(
  z.object({ name: z.string(), handler: z.function() })
);

export function parseWorkflow() {
  const workflow = {
    connections,
    roles,
    variables: variableDefinitions,
    steps,
  } as const;

  StepArraySchema.parse(steps);

  return workflow;
}
