"use server";
import "server-only";

import { isTokenExpired } from "@/app/lib/auth/oauth";
import { getToken } from "@/app/lib/auth/tokens";
import { hasOwnProperty } from "@/app/lib/utils";
import {
  evaluateGenerator,
  LogEntry,
  parseWorkflow,
  Step,
  StepStatus,
  Token,
  Variable,
  Workflow,
} from "@/app/lib/workflow";
import {
  JWT_PART_COUNT,
  PROVIDERS,
  ROLE_PREFIXES,
  STATUS_VALUES,
  VARIABLE_KEYS,
} from "@/app/lib/workflow/constants";
import {
  getStoredVariables,
  setStoredVariables,
} from "@/app/lib/workflow/variables-store";
import { runStepActions } from "./workflow-execution";
import { refreshWorkflowState } from "./workflow-state";

/** Basic authentication status for both providers. */
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

/**
 * Full snapshot of workflow state used by the UI layer.
 */
export interface WorkflowData {
  workflow: Workflow;
  variables: Record<string, string>;
  stepStatuses: Record<string, StepStatus>;
  auth: AuthState;
}

/**
 * Populate variables using defaults or generators from the workflow file.
 *
 * @param workflow - Parsed workflow definition
 * @returns Initial variable map
 */
async function initializeVariables(
  workflow: Workflow
): Promise<Record<string, string>> {
  const vars: Record<string, string> = {} as Record<string, string>;
  for (const name of Object.keys(workflow.variables)) {
    const def = workflow.variables[name];
    if (!hasOwnProperty(vars, name)) {
      if (def.default) {
        (vars as Record<string, string>)[name] = def.default;
      } else if (def.generator) {
        (vars as Record<string, string>)[name] = evaluateGenerator(
          def.generator
        );
      }
    }
  }
  return vars;
}

/**
 * Attempt to read the Azure tenant ID from the Microsoft token.
 *
 * @param microsoftToken - Token issued by Azure
 * @param onLog - Optional log handler
 * @returns Tenant ID or `null`
 */
function extractTenantId(
  microsoftToken?: Token | null,
  onLog?: (entry: LogEntry) => void
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

/**
 * Re-run verify actions to rebuild step status and derived variables.
 *
 * @param workflow - Workflow definition
 * @param variables - Current variable values
 * @param tokens - Authentication tokens
 * @returns Map of step statuses and updated variables
 */
async function reconstituteStepStatuses(
  workflow: Workflow,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token }
): Promise<{
  stepStatuses: Map<string, StepStatus>;
  variables: Record<string, string>;
}> {
  const stepStatuses = new Map<string, StepStatus>();
  const workingVariables = { ...variables };
  let manualData: { completed: string[]; completedAt: Record<string, number> } =
    { completed: [], completedAt: {} };
  if (workingVariables.manualStepsState) {
    try {
      manualData = JSON.parse(workingVariables.manualStepsState);
    } catch (error) {
      console.warn("Failed to parse manualStepsState", error);
    }
  }
  const manualCompleted = manualData.completed;

  const pendingStatus: StepStatus = { status: STATUS_VALUES.PENDING, logs: [] };

  const areDependenciesMet = (
    step: Step,
    manualCompleted: string[]
  ): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on.every((dep) => {
      const depStep = workflow.steps.find((s) => s.name === dep);
      const local = stepStatuses.get(dep);

      if (depStep?.manual) {
        return manualCompleted.includes(dep);
      }

      return local ?
          local.status === STATUS_VALUES.COMPLETED
            || local.status === STATUS_VALUES.SKIPPED
        : false;
    });
  };

  const isAuthMet = (step: Step): boolean => {
    if (!step.role) return true;
    const requiredScopes =
      hasOwnProperty(workflow.roles, step.role) ?
        workflow.roles[step.role]
      : [];
    const isGoogleStep =
      step.role.startsWith(ROLE_PREFIXES.GOOGLE_DIR)
      || step.role.startsWith(ROLE_PREFIXES.GOOGLE_CI);
    const isMicrosoftStep = step.role.startsWith(ROLE_PREFIXES.MICROSOFT);
    if (isGoogleStep && tokens.google != null) {
      return (
        !isTokenExpired(tokens.google)
        && requiredScopes.every((s) => tokens.google?.scope.includes(s))
      );
    }
    if (isMicrosoftStep && tokens.microsoft != null) {
      return (
        !isTokenExpired(tokens.microsoft)
        && requiredScopes.every((s) => tokens.microsoft?.scope.includes(s))
      );
    }
    return false;
  };

  const shouldSkipStep = (step: Step): boolean =>
    !areDependenciesMet(step, manualCompleted)
    || !isAuthMet(step)
    || (!!step.manual && !manualCompleted.includes(step.name))
    || (step.inputs ?
      step.inputs.some((i) => !hasOwnProperty(workingVariables, i))
    : false);

  const verifyStep = async (step: Step): Promise<void> => {
    const logs: LogEntry[] = [];
    try {
      const result = await runStepActions(
        step,
        workingVariables,
        tokens,
        (log) => logs.push(log),
        true
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

  return { stepStatuses, variables: workingVariables };
}

/**
 * Get complete workflow data by reconstructing state from verification checks
 */
/**
 * Load and verify the workflow configuration, returning a hydrated view.
 *
 * @param forceRefresh - When true, forces state revalidation
 * @returns Complete workflow data for the UI
 */
export async function getWorkflowData(
  forceRefresh = false
): Promise<WorkflowData> {
  console.log(
    `[Initial Load] Starting getWorkflowData (forceRefresh: ${forceRefresh})`
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
      ])
    )
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
 * Return minimal authentication status for both providers.
 *
 * @returns Current auth state for Google and Microsoft
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
/**
 * Collect all workflow variables along with whether each is required.
 *
 * @returns Map of variable names to current value and definition
 */
export async function getWorkflowVariables(): Promise<{
  variables: Record<
    string,
    { value?: string; definition: Variable; isRequired: boolean }
  >;
}> {
  const { workflow, variables } = await getWorkflowData();

  const result: Record<
    string,
    { value?: string; definition: Variable; isRequired: boolean }
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
      value: hasOwnProperty(variables, name) ? variables[name] : undefined,
      definition: def,
      isRequired: requiredVars.has(name),
    };
  }

  return { variables: result };
}
