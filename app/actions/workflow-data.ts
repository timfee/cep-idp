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
  Token,
} from "@/app/lib/workflow";
import {
  JWT_PART_COUNT,
  WORKFLOW_MAX_ITERATION_MULTIPLIER,
} from "@/app/lib/workflow/constants";
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

async function initializeVariables(
  workflow: Workflow,
): Promise<Record<string, string>> {
  const vars: Record<string, string> = { ...(await getGlobalVariables()) };
  for (const [name, def] of Object.entries(workflow.variables)) {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) {
      if (def.default) {
        vars[name] = def.default;
      } else if (def.generator) {
        vars[name] = evaluateGenerator(def.generator);
      }
    }
  }
  return vars;
}

function extractTenantId(microsoftToken?: Token | null): string | null {
  if (!microsoftToken) return null;
  try {
    const parts = microsoftToken.accessToken.split(".");
    if (parts.length === JWT_PART_COUNT) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      return payload.tid ?? null;
    }
  } catch (error) {
    console.warn("Failed to extract tenant ID from token:", error);
  }
  return null;
}

async function reconstituteStepStatuses(
  workflow: Workflow,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
): Promise<Map<string, StepStatus>> {
  const stepStatuses = new Map<string, StepStatus>();
  const processedSteps = new Set<string>();
  const globalStepStatuses = await getAllGlobalStepStatuses();

  const areDependenciesMet = (step: Step): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on.every((dep) => {
      const localStatus = stepStatuses.get(dep);
      if (localStatus && (localStatus.status === "completed" || localStatus.status === "skipped")) {
        return true;
      }
      const globalStatus = Object.prototype.hasOwnProperty.call(globalStepStatuses, dep)
        ? globalStepStatuses[dep as keyof typeof globalStepStatuses]
        : undefined;
      if (globalStatus && (globalStatus.status === "completed" || globalStatus.status === "skipped")) {
        stepStatuses.set(dep, globalStatus);
        return true;
      }
      return false;
    });
  };

  const isAuthMet = (step: Step): boolean => {
    if (!step.role) return true;
    const requiredScopes = Object.prototype.hasOwnProperty.call(workflow.roles, step.role)
      ? workflow.roles[step.role as keyof typeof workflow.roles]
      : [];
    const isGoogleStep = step.role.startsWith("dir") || step.role.startsWith("ci");
    const isMicrosoftStep = step.role.startsWith("graph");
    if (isGoogleStep && tokens.google) {
      return requiredScopes.every((s) => tokens.google!.scope.includes(s));
    }
    if (isMicrosoftStep && tokens.microsoft) {
      return requiredScopes.every((s) => tokens.microsoft!.scope.includes(s));
    }
    return false;
  };

  let iteration = 0;
  let lastProcessedCount = 0;
  const maxIterations = workflow.steps.length * WORKFLOW_MAX_ITERATION_MULTIPLIER;

  while (processedSteps.size < workflow.steps.length && iteration < maxIterations) {
    iteration++;
    if (iteration > 1 && processedSteps.size === lastProcessedCount) {
      console.warn(`[Initial Load] No progress made in iteration ${iteration}, breaking loop`);
      break;
    }
    lastProcessedCount = processedSteps.size;

    for (const step of workflow.steps) {
      if (processedSteps.has(step.name)) continue;

      const globalStatus = Object.prototype.hasOwnProperty.call(globalStepStatuses, step.name)
        ? globalStepStatuses[step.name as keyof typeof globalStepStatuses]
        : undefined;
      if (globalStatus && (globalStatus.status === "completed" || globalStatus.status === "skipped")) {
        if (step.outputs && step.outputs.length > 0) {
          const missingOutputs = step.outputs.filter((o) => {
            const hasLocal = Object.prototype.hasOwnProperty.call(variables, o);
            const hasGlobal = globalStatus.variables && Object.prototype.hasOwnProperty.call(globalStatus.variables, o);
            return !hasLocal && !hasGlobal;
          });
          if (missingOutputs.length === 0) {
            stepStatuses.set(step.name, globalStatus);
            processedSteps.add(step.name);
            if (globalStatus.variables) {
              Object.assign(variables, globalStatus.variables);
            }
            continue;
          }
        } else {
          stepStatuses.set(step.name, globalStatus);
          processedSteps.add(step.name);
          if (globalStatus.variables) {
            Object.assign(variables, globalStatus.variables);
          }
          continue;
        }
      }

      if (!areDependenciesMet(step)) {
        continue;
      }

      if (!isAuthMet(step)) {
        stepStatuses.set(step.name, { status: "pending", logs: [] });
        processedSteps.add(step.name);
        continue;
      }

      if (step.manual) {
        stepStatuses.set(step.name, { status: "pending", logs: [] });
        processedSteps.add(step.name);
        continue;
      }

      if (step.inputs && step.inputs.length > 0) {
        const missingInputs = step.inputs.filter((i) => !Object.prototype.hasOwnProperty.call(variables, i));
        if (missingInputs.length > 0) {
          stepStatuses.set(step.name, { status: "pending", logs: [] });
          processedSteps.add(step.name);
          continue;
        }
      }

      const existingGlobalStatus = await getAllGlobalStepStatuses();
      const currentGlobalStatus = Object.prototype.hasOwnProperty.call(existingGlobalStatus, step.name)
        ? existingGlobalStatus[step.name as keyof typeof existingGlobalStatus]
        : undefined;
      if (currentGlobalStatus && currentGlobalStatus.status === "failed") {
        stepStatuses.set(step.name, currentGlobalStatus);
        processedSteps.add(step.name);
        continue;
      }

      const logs: LogEntry[] = [];
      const result = await runStepActions(step, variables, tokens, (log) => logs.push(log), true);
      if (result.success) {
        Object.assign(variables, result.extractedVariables);
        for (const [k, v] of Object.entries(result.extractedVariables)) {
          await updateGlobalVariable(k, v);
        }
        stepStatuses.set(step.name, {
          status: "completed",
          logs,
          result: result.data,
          completedAt: Date.now(),
        });
        await updateGlobalStepStatus(step.name, stepStatuses.get(step.name) as StepStatus);
      } else {
        stepStatuses.set(step.name, { status: "pending", logs });
      }
      processedSteps.add(step.name);
    }
  }

  for (const step of workflow.steps) {
    if (!stepStatuses.has(step.name)) {
      stepStatuses.set(step.name, { status: "pending", logs: [] });
    }
  }

  if (iteration >= maxIterations) {
    console.warn(`[Initial Load] Stopped processing after ${iteration} iterations to prevent infinite loop`);
  }

  return stepStatuses;
}

/**
 * Get complete workflow data by reconstructing state from verification checks
 */
export async function getWorkflowData(
  forceRefresh = false,
): Promise<WorkflowData> {
  console.log(
    `[Initial Load] Starting getWorkflowData (forceRefresh: ${forceRefresh})`,
  );

  const googleToken = await getToken("google");
  const microsoftToken = await getToken("microsoft");

  const tokens = {
    google: googleToken ?? undefined,
    microsoft: microsoftToken ?? undefined,
  };

  const workflow = parseWorkflow();
  const variables = await initializeVariables(workflow);

  const tenantId = extractTenantId(microsoftToken);
  if (tenantId && !variables.tenantId) {
    variables.tenantId = tenantId;
    await updateGlobalVariable("tenantId", tenantId);
  }

  const stepStatusesMap = await reconstituteStepStatuses(workflow, variables, tokens);

  console.log(
    `[Initial Load] Final step statuses:`,
    Object.fromEntries(
      Array.from(stepStatusesMap.entries()).map(([name, status]) => [
        name,
        status.status,
      ]),
    ),
  );

  return {
    workflow,
    variables,
    stepStatuses: Object.fromEntries(stepStatusesMap),
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
          const matches = payloadStr.matchAll(/\{([^{}]+)\}/g);
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
      value: Object.prototype.hasOwnProperty.call(variables, name)
        ? variables[name as keyof typeof variables]
        : undefined,
      definition: def,
      isRequired: requiredVars.has(name),
    };
  }

  return { variables: result };
}
