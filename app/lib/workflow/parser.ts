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

/**
 * Construct an immutable `WorkflowDefinition` object that contains
 * connections, roles, variable metadata and ordered steps.  The function
 * performs a lightweight Zod validation to assert that every step has the
 * required "name" and "handler" fields before returning the assembled
 * workflow.
 *
 * @returns A fully validated, typed `WorkflowDefinition` ready for execution
 */
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
