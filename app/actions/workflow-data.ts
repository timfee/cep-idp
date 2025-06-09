"use server";

import { getToken } from "@/app/lib/auth/tokens";
import { isTokenExpired } from "@/app/lib/auth/oauth";
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
import { JWT_PART_COUNT } from "@/app/lib/workflow/constants";
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
    expiresAt?: number;
    hasRefreshToken?: boolean;
  };
  microsoft: {
    authenticated: boolean;
    scopes: string[];
    expiresAt?: number;
    hasRefreshToken?: boolean;
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
  const globalStepStatuses = await getAllGlobalStepStatuses();

  const pendingStatus = { status: "pending", logs: [] } as StepStatus;

  const areDependenciesMet = (step: Step): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on.every((dep) => {
      const local = stepStatuses.get(dep);
      if (local && (local.status === "completed" || local.status === "skipped")) {
        return true;
      }
      const global = globalStepStatuses[dep as keyof typeof globalStepStatuses];
      return global ? global.status === "completed" || global.status === "skipped" : false;
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
      return !isTokenExpired(tokens.google) && requiredScopes.every((s) => tokens.google!.scope.includes(s));
    }
    if (isMicrosoftStep && tokens.microsoft) {
      return !isTokenExpired(tokens.microsoft) && requiredScopes.every((s) => tokens.microsoft!.scope.includes(s));
    }
    return false;
  };

  const applyGlobalStatus = (step: Step, status: StepStatus | undefined): boolean => {
    if (!status) return false;
    if (status.status !== "completed" && status.status !== "skipped") {
      return false;
    }
    const missing = step.outputs?.some((o) => {
      const hasLocal = Object.prototype.hasOwnProperty.call(variables, o);
      const hasGlobal = status.variables && Object.prototype.hasOwnProperty.call(status.variables, o);
      return !hasLocal && !hasGlobal;
    });
    if (!missing) {
      stepStatuses.set(step.name, status);
      if (status.variables) {
        Object.assign(variables, status.variables);
      }
      return true;
    }
    return false;
  };

  const shouldSkipStep = (step: Step): boolean =>
    !areDependenciesMet(step) ||
    !isAuthMet(step) ||
    step.manual ||
    (step.inputs && step.inputs.some((i) => !Object.prototype.hasOwnProperty.call(variables, i)));

  const verifyStep = async (step: Step): Promise<void> => {
    const latest = await getAllGlobalStepStatuses();
    const existing = latest[step.name as keyof typeof latest];
    if (existing && existing.status === "failed") {
      stepStatuses.set(step.name, existing);
      return;
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
  };

  for (const step of workflow.steps) {
    const globalStatus = globalStepStatuses[step.name as keyof typeof globalStepStatuses];
    if (applyGlobalStatus(step, globalStatus)) {
      continue;
    }

    if (shouldSkipStep(step)) {
      stepStatuses.set(step.name, pendingStatus);
      continue;
    }

    await verifyStep(step);
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
        expiresAt: googleToken?.expiresAt,
        hasRefreshToken: !!googleToken?.refreshToken,
      },
      microsoft: {
        authenticated: !!microsoftToken,
        scopes: microsoftToken?.scope || [],
        expiresAt: microsoftToken?.expiresAt,
        hasRefreshToken: !!microsoftToken?.refreshToken,
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
      expiresAt: googleToken?.expiresAt,
      hasRefreshToken: !!googleToken?.refreshToken,
    },
    microsoft: {
      authenticated: !!microsoftToken,
      scopes: microsoftToken?.scope || [],
      expiresAt: microsoftToken?.expiresAt,
      hasRefreshToken: !!microsoftToken?.refreshToken,
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
