"use server";

import { getToken } from "@/app/lib/auth/tokens";
import {
  evaluateGenerator,
  LogEntry,
  parseWorkflow,
  Step,
  StepStatus,
  Variable,
  Workflow,
} from "@/app/lib/workflow";
import { runStepActions } from "./workflow-execution";
import {
  getAllGlobalStepStatuses,
  getGlobalVariables,
  updateGlobalStepStatus,
  updateGlobalVariable,
} from "./workflow-state";

export interface AuthState {
  google: {
    authenticated: boolean;
    scopes: string[];
  };
  microsoft: {
    authenticated: boolean;
    scopes: string[];
  };
}

export interface WorkflowData {
  workflow: Workflow;
  variables: Record<string, string>;
  stepStatuses: Record<string, StepStatus>;
  auth: AuthState;
}

/**
 * Get complete workflow data by reconstructing state from verification checks
 */
export async function getWorkflowData(
  forceRefresh = false
): Promise<WorkflowData> {
  console.log(
    `[Initial Load] Starting getWorkflowData (forceRefresh: ${forceRefresh})`
  );

  // Get auth status
  const googleToken = await getToken("google");
  const microsoftToken = await getToken("microsoft");

  const tokens = {
    google: googleToken ?? undefined,
    microsoft: microsoftToken ?? undefined,
  };

  // Get workflow definition
  const workflow = parseWorkflow();

  // Initialize variables with defaults and merge with global state
  const variables: Record<string, string> = { ...(await getGlobalVariables()) };

  for (const [name, varDef] of Object.entries(workflow.variables)) {
    if (!variables[name]) {
      if (varDef.default) {
        variables[name] = varDef.default;
      } else if (varDef.generator) {
        variables[name] = evaluateGenerator(varDef.generator);
      }
    }
  }

  // Process steps in dependency order
  const stepStatuses: Record<string, StepStatus> = {};
  const processedSteps = new Set<string>();

  // Get global step statuses
  const globalStepStatuses = await getAllGlobalStepStatuses();

  // Helper to check if all dependencies are met (must be executed, not just verified)
  const areDependenciesMet = (step: Step): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on.every((dep) => {
      // Check local status first, then global status
      const localStatus = stepStatuses[dep];
      if (
        localStatus &&
        (localStatus.status === "completed" || localStatus.status === "skipped")
      ) {
        return true;
      }

      const globalStatus = globalStepStatuses[dep];
      if (
        globalStatus &&
        (globalStatus.status === "completed" ||
          globalStatus.status === "skipped")
      ) {
        // Copy global status to local for consistency
        stepStatuses[dep] = globalStatus;
        return true;
      }

      return false;
    });
  };

  // Helper to check if auth requirements are met
  const isAuthMet = (step: Step): boolean => {
    if (!step.role) return true;

    const requiredScopes = workflow.roles[step.role] || [];
    const isGoogleStep =
      step.role.startsWith("dir") || step.role.startsWith("ci");
    const isMicrosoftStep = step.role.startsWith("graph");

    if (isGoogleStep && googleToken) {
      return requiredScopes.every((scope) => googleToken.scope.includes(scope));
    } else if (isMicrosoftStep && microsoftToken) {
      return requiredScopes.every((scope) =>
        microsoftToken.scope.includes(scope)
      );
    }

    return false;
  };

  // Process steps until all are processed
  let iteration = 0;
  let lastProcessedCount = 0;

  while (
    processedSteps.size < workflow.steps.length &&
    iteration < workflow.steps.length * 2 // Allow more iterations but prevent infinite loops
  ) {
    iteration++;

    // Track progress to prevent infinite loops
    if (iteration > 1 && processedSteps.size === lastProcessedCount) {
      console.warn(
        `[Initial Load] No progress made in iteration ${iteration}, breaking loop`
      );
      break;
    }
    lastProcessedCount = processedSteps.size;

    for (const step of workflow.steps) {
      if (processedSteps.has(step.name)) continue;

      // Check if step is already completed globally
      const globalStatus = globalStepStatuses[step.name];
      if (
        globalStatus &&
        (globalStatus.status === "completed" ||
          globalStatus.status === "skipped")
      ) {
        // Verify that expected outputs were actually extracted
        if (step.outputs && step.outputs.length > 0) {
          const missingOutputs = step.outputs.filter(
            (output) =>
              !variables[output] &&
              (!globalStatus.variables || !globalStatus.variables[output])
          );
          if (missingOutputs.length > 0) {
            console.log(
              `[Initial Load] Step ${step.name} marked completed but missing outputs: ${missingOutputs.join(", ")} - re-running`
            );
            // Don't use global status, re-run the step
          } else {
            stepStatuses[step.name] = globalStatus;
            processedSteps.add(step.name);
            // Merge any variables from completed step
            if (globalStatus.variables) {
              Object.assign(variables, globalStatus.variables);
            }
            console.log(
              `[Initial Load] Using global status for: ${step.name} (${globalStatus.status})`
            );
            continue;
          }
        } else {
          stepStatuses[step.name] = globalStatus;
          processedSteps.add(step.name);
          // Merge any variables from completed step
          if (globalStatus.variables) {
            Object.assign(variables, globalStatus.variables);
          }
          console.log(
            `[Initial Load] Using global status for: ${step.name} (${globalStatus.status})`
          );
          continue;
        }
      }

      // Skip if dependencies not met
      if (!areDependenciesMet(step)) {
        continue;
      }

      // Check auth requirements
      if (!isAuthMet(step)) {
        stepStatuses[step.name] = { status: "pending", logs: [] };
        processedSteps.add(step.name);
        continue;
      }

      // Skip manual steps
      if (step.manual) {
        stepStatuses[step.name] = { status: "pending", logs: [] };
        processedSteps.add(step.name);
        continue;
      }

      // For initial load, check if step has required inputs
      if (step.inputs && step.inputs.length > 0) {
        const missingInputs = step.inputs.filter((input) => !variables[input]);
        if (missingInputs.length > 0) {
          console.log(
            `[Initial Load] Missing inputs for ${step.name}: ${missingInputs.join(", ")}`
          );
          stepStatuses[step.name] = { status: "pending", logs: [] };
          processedSteps.add(step.name);
          continue;
        }
      }

      // Check if step already has a failed status - don't overwrite it
      const existingGlobalStatus = await getAllGlobalStepStatuses();
      const currentGlobalStatus = existingGlobalStatus[step.name];

      if (currentGlobalStatus && currentGlobalStatus.status === "failed") {
        stepStatuses[step.name] = currentGlobalStatus;
        processedSteps.add(step.name);
        continue;
      }

      // Run verification actions only for this step

      const logs: LogEntry[] = [];
      const actionResult = await runStepActions(
        step,
        variables,
        tokens,
        (log) => logs.push(log),
        true // verification only
      );

      if (actionResult.success) {
        // Update variables with extracted values
        Object.assign(variables, actionResult.extractedVariables);

        // Persist variables globally
        for (const [key, value] of Object.entries(
          actionResult.extractedVariables
        )) {
          await updateGlobalVariable(key, value);
        }

        stepStatuses[step.name] = {
          status: "completed",
          logs,
          result: actionResult.data,
          completedAt: Date.now(),
        };

        // Persist step completion globally
        await updateGlobalStepStatus(step.name, stepStatuses[step.name]);
      } else {
        stepStatuses[step.name] = { status: "pending", logs };
      }

      processedSteps.add(step.name);
    }
  }

  // Mark any unprocessed steps as pending
  for (const step of workflow.steps) {
    if (!stepStatuses[step.name]) {
      stepStatuses[step.name] = { status: "pending", logs: [] };
    }
  }

  // Break infinite loop protection
  if (iteration >= workflow.steps.length * 2) {
    console.warn(
      `[Initial Load] Stopped processing after ${iteration} iterations to prevent infinite loop`
    );
  }

  console.log(
    `[Initial Load] Final step statuses:`,
    Object.fromEntries(
      Object.entries(stepStatuses).map(([name, status]) => [
        name,
        status.status,
      ])
    )
  );

  return {
    workflow,
    variables,
    stepStatuses,
    auth: {
      google: {
        authenticated: !!googleToken,
        scopes: googleToken?.scope || [],
      },
      microsoft: {
        authenticated: !!microsoftToken,
        scopes: microsoftToken?.scope || [],
      },
    },
  };
}

/**
 * Get authentication status
 */
export async function getAuthStatus(): Promise<AuthState> {
  const googleToken = await getToken("google");
  const microsoftToken = await getToken("microsoft");

  return {
    google: {
      authenticated: !!googleToken,
      scopes: googleToken?.scope || [],
    },
    microsoft: {
      authenticated: !!microsoftToken,
      scopes: microsoftToken?.scope || [],
    },
  };
}

/**
 * Get available variables and their definitions
 */
export async function getWorkflowVariables(): Promise<{
  variables: Record<
    string,
    {
      value?: string;
      definition: Variable;
      isRequired: boolean;
    }
  >;
}> {
  const workflow = parseWorkflow();
  const variables = await getGlobalVariables();

  const result: Record<
    string,
    {
      value?: string;
      definition: Variable;
      isRequired: boolean;
    }
  > = {};

  // Check which variables are required by steps
  const requiredVars = new Set<string>();
  for (const step of workflow.steps) {
    if (step.actions) {
      for (const action of step.actions) {
        if (action.payload) {
          const payloadStr = JSON.stringify(action.payload);
          const matches = payloadStr.matchAll(/\{([^}]+)\}/g);
          for (const match of matches) {
            requiredVars.add(match[1]);
          }
        }
      }
    }
  }

  // Build result with current values and definitions
  for (const [name, def] of Object.entries(workflow.variables)) {
    result[name] = {
      value: variables[name],
      definition: def,
      isRequired: requiredVars.has(name),
    };
  }

  return { variables: result };
}
