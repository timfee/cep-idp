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
import {
  JWT_PART_COUNT,
  PROVIDERS,
  STATUS_VALUES,
  VARIABLE_KEYS,
} from "@/app/lib/workflow/constants";
import { getStoredVariables, setStoredVariables } from "@/app/lib/workflow";
import { runStepActions } from "./workflow-execution";
import { refreshWorkflowState } from "./workflow-state";

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
  const vars: Record<string, string> = {};
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

function extractTenantId(
  microsoftToken?: Token | null,
  onLog?: (entry: LogEntry) => void,
): string | null {
  if (!microsoftToken) return null;
  try {
    const parts = microsoftToken.accessToken.split(".");
    if (parts.length === JWT_PART_COUNT) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      return payload.tid ?? null;
    }
  } catch (error) {
    onLog?.({
      timestamp: Date.now(),
      level: "warn",
      message: "Failed to extract tenant ID from token",
      data: error,
    });
  }
  return null;
}

async function reconstituteStepStatuses(
  workflow: Workflow,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
): Promise<{
  stepStatuses: Map<string, StepStatus>;
  variables: Record<string, string>;
}> {
  const stepStatuses = new Map<string, StepStatus>();
  const workingVariables = { ...variables };

  const pendingStatus: StepStatus = { status: STATUS_VALUES.PENDING, logs: [] };

  const areDependenciesMet = (step: Step): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on.every((dep) => {
      const local = stepStatuses.get(dep);
      return local
        ? local.status === STATUS_VALUES.COMPLETED ||
            local.status === STATUS_VALUES.SKIPPED
        : false;
    });
  };

  const isAuthMet = (step: Step): boolean => {
    if (!step.role) return true;
    const requiredScopes = Object.prototype.hasOwnProperty.call(
      workflow.roles,
      step.role,
    )
      ? workflow.roles[step.role]
      : [];
    const isGoogleStep =
      step.role.startsWith("dir") || step.role.startsWith("ci");
    const isMicrosoftStep = step.role.startsWith("graph");
    if (isGoogleStep && tokens.google != null) {
      return (
        !isTokenExpired(tokens.google) &&
        requiredScopes.every((s) => tokens.google?.scope.includes(s))
      );
    }
    if (isMicrosoftStep && tokens.microsoft != null) {
      return (
        !isTokenExpired(tokens.microsoft) &&
        requiredScopes.every((s) => tokens.microsoft?.scope.includes(s))
      );
    }
    return false;
  };

  const shouldSkipStep = (step: Step): boolean =>
    !areDependenciesMet(step) ||
    !isAuthMet(step) ||
    !!step.manual ||
    (step.inputs
      ? step.inputs.some(
          (i) => !Object.prototype.hasOwnProperty.call(workingVariables, i),
        )
      : false);

  const verifyStep = async (step: Step): Promise<void> => {
    const logs: LogEntry[] = [];
    try {
      const result = await runStepActions(
        step,
        workingVariables,
        tokens,
        (log) => logs.push(log),
        true,
      );
      if (result.success) {
        Object.assign(workingVariables, result.extractedVariables);
        stepStatuses.set(step.name, {
          status: STATUS_VALUES.COMPLETED,
          logs,
          result: result.data,
          completedAt: Date.now(),
        });
      } else {
        stepStatuses.set(step.name, { status: STATUS_VALUES.PENDING, logs });
      }
    } catch (error) {
      logs.push({
        timestamp: Date.now(),
        level: "error",
        message: `Verification failed for ${step.name}`,
        data: error,
      });
      stepStatuses.set(step.name, { status: STATUS_VALUES.PENDING, logs });
    }
  };

  for (const step of workflow.steps) {
    if (shouldSkipStep(step)) {
      stepStatuses.set(step.name, pendingStatus);
      continue;
    }

    await verifyStep(step);
  }

  return {
    stepStatuses,
    variables: workingVariables,
  };
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

  if (forceRefresh) {
    await refreshWorkflowState();
  }

  const googleToken = await getToken(PROVIDERS.GOOGLE);
  const microsoftToken = await getToken(PROVIDERS.MICROSOFT);

  const tokens = {
    google: googleToken ?? undefined,
    microsoft: microsoftToken ?? undefined,
  };

  const workflow = parseWorkflow();
  const variables = await initializeVariables(workflow);
  const storedVars = await getStoredVariables();
  Object.assign(variables, storedVars);

  const tenantId = extractTenantId(microsoftToken);
  if (tenantId && !variables[VARIABLE_KEYS.TENANT_ID]) {
    variables[VARIABLE_KEYS.TENANT_ID] = tenantId;
  }

  const { stepStatuses: stepStatusesMap, variables: reconstructedVariables } =
    await reconstituteStepStatuses(workflow, variables, tokens);

  // Persist variables reconstructed from verification so they are available
  // during subsequent executions. This acts as a central variable store
  // ensuring all extracted values survive between requests.
  await setStoredVariables(reconstructedVariables);

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
    variables: reconstructedVariables,
    stepStatuses: Object.fromEntries(stepStatusesMap),
    auth: {
      google: {
        authenticated: !!googleToken && !isTokenExpired(googleToken),
        scopes: googleToken?.scope || [],
        expiresAt: googleToken?.expiresAt,
        hasRefreshToken: !!googleToken?.refreshToken,
      },
      microsoft: {
        authenticated: !!microsoftToken && !isTokenExpired(microsoftToken),
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
  const googleToken = await getToken(PROVIDERS.GOOGLE);
  const microsoftToken = await getToken(PROVIDERS.MICROSOFT);

  return {
    google: {
      authenticated: !!googleToken && !isTokenExpired(googleToken),
      scopes: googleToken?.scope || [],
      expiresAt: googleToken?.expiresAt,
      hasRefreshToken: !!googleToken?.refreshToken,
    },
    microsoft: {
      authenticated: !!microsoftToken && !isTokenExpired(microsoftToken),
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
  const { workflow, variables } = await getWorkflowData();

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
        ? variables[name]
        : undefined,
      definition: def,
      isRequired: requiredVars.has(name),
    };
  }

  return { variables: result };
}
