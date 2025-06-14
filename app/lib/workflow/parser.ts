import { z } from "zod";

import { connections, roles, variableDefinitions } from "./config";
import { StepDefinition } from "./types";
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

  StepArraySchema.parse(steps);

  return workflow;
}
