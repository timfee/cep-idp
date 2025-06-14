import { z } from "zod";

import { connections, roles, variableDefinitions } from "./config";
import { endpointRegistry } from "./endpoints";
import { StepDefinition, WorkflowSchema, Workflow } from "./types";

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
    // We don't need to validate the runtime signature here; just ensure the property exists
    handler: z.any(),
  })
);

const checkers = {
  exists: "$ != null",
  fieldTruthy: "$.{field} == true",
  eq: "$ == '{value}'",
} as const;

export function parseWorkflow() {
  const workflow = {
    connections,
    roles,
    endpoints: endpointRegistry,
    checkers,
    variables: variableDefinitions,
    steps,
  } as const;

  WorkflowSchema.partial().parse(workflow); // structural validation
  StepArraySchema.parse(steps);

  return workflow as unknown as Workflow;
}
