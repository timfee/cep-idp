"use server";

import "server-only";

import { isTokenExpired } from "@/app/lib/auth/oauth";
import { getToken } from "@/app/lib/auth/tokens";
import { hasOwnProperty } from "@/app/lib/utils";
import { serverLogger } from "@/app/lib/workflow/logger";

// Import types only to assist consumers while avoiding runtime impact.
// Bring in for future type adjustments – disable sonar unused import for now

import {
  assembleWorkflow,
  evaluateGenerator,
  LogEntry,
  StepStatus,
  Token
} from "@/app/lib/workflow";
import {
  JWT_PART_COUNT,
  PROVIDERS,
  ROLE_PREFIXES,
  STATUS_VALUES,
  VARIABLE_KEYS
} from "@/app/lib/workflow/constants";
import type { StepDefinition } from "@/app/lib/workflow/types";
import {
  getStoredVariables,
  setStoredVariables
} from "@/app/lib/workflow/variables-store";
import { runStepActions } from "./workflow-execution";
import { refreshWorkflowState } from "./workflow-state";

/**
 * Authentication status metadata for both identity providers used by the
 * workflow engine.  The structure is consumed by React UI components to decide
 * which provider still requires user interaction.
 */
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
 * Hydrated snapshot of the workflow engine state exposed to UI components.
 *
 * @remarks
 * The structure bundles together the parsed YAML workflow definition, the
 * current variable map (including values reconstructed from verify-only step
 * checks), per-step execution status and the authentication health for each
 * provider.
 */
export interface WorkflowData {
  workflow: ReturnType<typeof assembleWorkflow>;
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
  workflow: ReturnType<typeof assembleWorkflow>
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
      data: error
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
  workflow: ReturnType<typeof assembleWorkflow>,
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
      serverLogger.warn("Failed to parse manualStepsState", error);
    }
  }
  const manualCompleted = manualData.completed;

  const pendingStatus: StepStatus = { status: STATUS_VALUES.PENDING, logs: [] };

  const areDependenciesMet = (
    step: StepDefinition,
    manualCompleted: string[]
  ): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on?.every((dep: string) => {
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

  const isAuthMet = (step: StepDefinition): boolean => {
    if (!step.role) return true;
    const requiredScopes =
      hasOwnProperty(workflow.roles, step.role) ?
        (workflow.roles as Record<string, string[]>)[step.role]
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

  const shouldSkipStep = (step: StepDefinition): boolean =>
    !areDependenciesMet(step, manualCompleted)
    || !isAuthMet(step)
    || (!!step.manual && !manualCompleted.includes(step.name))
    || (step.inputs ?
      step.inputs.some((i) => !hasOwnProperty(workingVariables, i))
    : false);

  const verifyStep = async (step: StepDefinition): Promise<void> => {
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
          completedAt: Date.now()
        });
      } else {
        stepStatuses.set(step.name, { status: STATUS_VALUES.PENDING, logs });
      }
    } catch (error) {
      logs.push({
        timestamp: Date.now(),
        level: "error",
        message: `Verification failed for ${step.name}`,
        data: error
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
/**
 * Load and verify the workflow configuration, returning a hydrated view that
 * the UI layer can render directly.
 *
 * @param forceRefresh - When `true`, forces verification actions to re-run and
 *   persisted variable state to be regenerated before the snapshot is
 *   returned.
 * @returns Complete, type-safe workflow state data ready for consumption by
 *   React components.
 */
export async function getWorkflowData(
  forceRefresh = false
): Promise<WorkflowData> {
  serverLogger.info(
    `[Initial Load] Starting getWorkflowData (forceRefresh: ${forceRefresh})`
  );

  if (forceRefresh) {
    await refreshWorkflowState();
  }

  const googleToken = await getToken(PROVIDERS.GOOGLE);
  const microsoftToken = await getToken(PROVIDERS.MICROSOFT);

  const tokens = {
    google: googleToken ?? undefined,
    microsoft: microsoftToken ?? undefined
  };

  serverLogger.info("Tokens loaded", tokens);
  // Build the full workflow definition which contains executable handler
  // functions. These handler functions **cannot** be sent to the browser –
  // Next.js will throw "Functions cannot be passed directly to Client
  // Components" if we include them in the serialized props of a Client
  // component.  To avoid this runtime error we deep-clone the workflow using
  // `JSON.parse(JSON.stringify(...))`, which strips out all function
  // properties.  The UI layer only requires descriptive metadata (name,
  // role, inputs, etc.) so removing the handlers is safe and keeps type
  // information intact server-side.
  const fullWorkflow = assembleWorkflow();

  // Create a serialisable clone for the browser by JSON-stringifying and
  // parsing the object.  This strips out any function references (e.g. the
  // `handler` on each step) while keeping simple data like strings, numbers &
  // arrays intact.
  //
  // The heavy `fullWorkflow` with executable code continues to be used on the
  // server below, whereas `workflow` is returned to the client purely for
  // rendering.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const workflow = JSON.parse(JSON.stringify(fullWorkflow)) as ReturnType<
    typeof assembleWorkflow
  >;
  const variables = await initializeVariables(workflow);
  const storedVars = await getStoredVariables();
  Object.assign(variables, storedVars);

  const tenantId = extractTenantId(microsoftToken);
  if (tenantId && !variables[VARIABLE_KEYS.TENANT_ID]) {
    variables[VARIABLE_KEYS.TENANT_ID] = tenantId;
  }

  const { stepStatuses: stepStatusesMap, variables: reconstructedVariables } =
    await reconstituteStepStatuses(fullWorkflow, variables, tokens);

  // Persist variables reconstructed from verification so they are available
  // during subsequent executions. This acts as a central variable store
  // ensuring all extracted values survive between requests.
  if (forceRefresh) {
    await setStoredVariables(reconstructedVariables);
  }
  serverLogger.info(
    `[Initial Load] Final step statuses:`,
    Object.fromEntries(
      Array.from(stepStatusesMap.entries()).map(([name, status]) => [
        name,
        status.status
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
        hasRefreshToken: !!googleToken?.refreshToken
      },
      microsoft: {
        authenticated: !!microsoftToken && !isTokenExpired(microsoftToken),
        scopes: microsoftToken?.scope || [],
        expiresAt: microsoftToken?.expiresAt,
        hasRefreshToken: !!microsoftToken?.refreshToken
      }
    }
  };
}

/**
 * Return minimal authentication status for both providers.
 *
 * @returns Current auth state for Google and Microsoft
 */
/**
 * Re-compute the authentication status for Google and Microsoft providers.
 *
 * Unlike {@link getWorkflowData} this helper focuses solely on auth-related
 * data so that UI components can refresh the indicator without incurring the
 * overhead of full workflow verification.
 *
 * @returns Current {@link AuthState} describing token validity and scope sets
 */
export async function getAuthStatus(): Promise<AuthState> {
  const googleToken = await getToken(PROVIDERS.GOOGLE);
  const microsoftToken = await getToken(PROVIDERS.MICROSOFT);

  return {
    google: {
      authenticated: !!googleToken && !isTokenExpired(googleToken),
      scopes: googleToken?.scope || [],
      expiresAt: googleToken?.expiresAt,
      hasRefreshToken: !!googleToken?.refreshToken
    },
    microsoft: {
      authenticated: !!microsoftToken && !isTokenExpired(microsoftToken),
      scopes: microsoftToken?.scope || [],
      expiresAt: microsoftToken?.expiresAt,
      hasRefreshToken: !!microsoftToken?.refreshToken
    }
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
// Reusable structure for variable metadata used below
type WorkflowVariableInfo = {
  value?: string;
  definition: {
    default?: string;
    generator?: string;
    validator?: string | RegExp;
    comment?: string;
  };
  isRequired: boolean;
};

/**
 * Return the variable map persisted in cookies combined with initial defaults
 * in the workflow file.
 *
 * @returns Object containing the reconstructed variable map and a boolean that
 *   indicates whether the map had to be initialised from scratch.
 */
export async function getWorkflowVariables(): Promise<{
  variables: Record<string, WorkflowVariableInfo>;
}> {
  const { workflow, variables } = await getWorkflowData();

  const result: Record<string, WorkflowVariableInfo> = {};

  // Determine required variables – based on step.inputs declarations
  const requiredVars = new Set<string>();
  for (const step of workflow.steps) {
    if (step.inputs && step.inputs.length > 0) {
      step.inputs.forEach((input) => requiredVars.add(input));
    }
  }

  // Build result with current values and definitions
  for (const [name, def] of Object.entries(workflow.variables)) {
    result[name] = {
      value: hasOwnProperty(variables, name) ? variables[name] : undefined,
      definition: def,
      isRequired: requiredVars.has(name)
    };
  }

  return { variables: result };
}
