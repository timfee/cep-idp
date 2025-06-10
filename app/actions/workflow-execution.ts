"use server";
import "server-only";

import { apiRequest } from "@/app/lib/api/client";
import { getToken } from "@/app/lib/auth/tokens";
import {
  Action,
  Endpoint,
  evaluateChecker,
  extractMissingVariables,
  extractValueFromPath,
  filterActions,
  LogEntry,
  parseWorkflow,
  Step,
  StepStatus,
  substituteObject,
  substituteVariables,
  Token,
  Workflow,
} from "@/app/lib/workflow";
import {
  CONNECTION_IDENTIFIERS,
  COPY_FEEDBACK_DURATION_MS,
  ERROR_MESSAGES,
  PROVIDERS,
  STATUS_VALUES,
  STEP_NAMES,
  VARIABLE_KEYS,
  WORKFLOW_CONSTANTS,
} from "@/app/lib/workflow/constants";
import { safeAsync } from "@/app/lib/workflow/error-handling";
import { setStoredVariables } from "@/app/lib/workflow/variables-store";
import { revalidatePath } from "next/cache";
import { getWorkflowData } from "./workflow-data";
import { needsInteractiveInput } from "./workflow-interactive";

/**
 * Evaluate a simple condition expression against the current workflow
 * variables.
 *
 * Supported expressions:
 * - `variable.isNew` to check if a variable was newly created
 * - `a == 'b'` for equality comparisons
 * - `!variable` for negation
 * - plain variable names for existence checks
 *
 * @param condition - Condition string to evaluate
 * @param variables - Stored workflow variables
 * @returns `true` if the condition is satisfied
 */
function evaluateCondition(
  condition: string,
  variables: Record<string, string>
): boolean {
  // Handle .isNew condition
  if (condition.endsWith(".isNew")) {
    const varName = condition.replace(".isNew", "");
    return !variables[`${varName}_existing`];
  }

  // Handle equality conditions
  if (condition.includes(" == ")) {
    const [left, right] = condition.split(" == ").map((s) => s.trim());
    const leftValue = variables[left] || left;
    const rightValue = right.replace(/['"]/g, "");
    return leftValue === rightValue;
  }

  // Handle negation
  if (condition.startsWith("!")) {
    const varName = condition.substring(1);
    return !variables[varName];
  }

  // Simple variable existence check
  return !!variables[condition];
}

/**
 * Pull values out of an API response according to action configuration.
 */
function applyExtracts(
  action: Action,
  response: unknown,
  variables: Record<string, string>,
  extractedVariables: Record<string, string>,
  onLog: (entry: LogEntry) => void,
  capturedValues: Record<string, string> = {}
): void {
  if (!action.extract) return;
  for (const [varName, path] of Object.entries(action.extract)) {
    // Special handling for password display marker
    if (
      varName === VARIABLE_KEYS.GENERATED_PASSWORD
      && path === WORKFLOW_CONSTANTS.PASSWORD_EXTRACTION_KEY
    ) {
      const password =
        capturedValues[VARIABLE_KEYS.GENERATED_PASSWORD]
        ?? variables[VARIABLE_KEYS.GENERATED_PASSWORD];
      if (password) {
        extractedVariables[varName] = password;
        variables[VARIABLE_KEYS.GENERATED_PASSWORD] = password;
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Extracted password for display`,
        });
      }
    } else {
      const value = extractValueFromPath(response, path);
      if (value != null) {
        const storedValue =
          typeof value === "object" ? JSON.stringify(value) : String(value);
        extractedVariables[varName] = storedValue;
        variables[varName] = storedValue;
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Extracted variable: ${varName} = ${storedValue}`,
        });
      }
    }
  }
}

/** Determine if a step failed to produce required outputs. */
function areOutputsMissing(
  step: Step,
  extracted: Record<string, string>
): boolean {
  return !!step.outputs && step.outputs.some((o) => !extracted[o]);
}

/** Ensure that an action can run given its endpoint and variables. */
function validateActionPrerequisites(
  action: Action,
  endpoint: Endpoint | undefined,
  variables: Record<string, string>,
  onLog: (entry: LogEntry) => void
): { isValid: boolean; missingVars?: string[] } {
  if (!endpoint) {
    onLog({
      timestamp: Date.now(),
      level: "error",
      message: ERROR_MESSAGES.ENDPOINT_NOT_FOUND(action.use),
    });
    return { isValid: false };
  }

  const missingVars =
    endpoint.path ? extractMissingVariables(endpoint.path, variables) : [];
  if (missingVars.length > 0) {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: `Skipping action ${action.use} - missing variables: ${missingVars.join(", ")}`,
    });
    return { isValid: false, missingVars };
  }

  return { isValid: true };
}

/** Build and substitute an action payload object. */
function prepareActionPayload(
  action: Action,
  variables: Record<string, string>
): { payload: unknown; capturedValues: Record<string, string> } {
  const capturedValues: Record<string, string> = {};
  const payload =
    action.payload ?
      substituteObject(action.payload, variables, {
        throwOnMissing: !action.fallback,
        captureGenerated: capturedValues,
      })
    : undefined;
  return { payload, capturedValues };
}

/**
 * Process the result of an API call and extract variables.
 */
async function processActionResponse(
  action: Action,
  response: unknown,
  variables: Record<string, string>,
  extractedVariables: Record<string, string>,
  allCapturedValues: Record<string, string>,
  onLog: (entry: LogEntry) => void
): Promise<{ success: boolean; extractedVariables: Record<string, string> }> {
  if (action.longRunning) {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: "Waiting for long-running operation...",
    });
    await new Promise((resolve) =>
      setTimeout(resolve, COPY_FEEDBACK_DURATION_MS)
    );
  }

  if (action.checker && response !== null) {
    const verified = evaluateChecker(action, response);
    if (!verified && !action.fallback) {
      return { success: false, extractedVariables };
    }
  }

  Object.assign(extractedVariables, allCapturedValues);
  Object.assign(variables, allCapturedValues);
  applyExtracts(
    action,
    response,
    variables,
    extractedVariables,
    onLog,
    allCapturedValues
  );

  return { success: true, extractedVariables };
}

import { assertNever, parseApiError } from "@/app/lib/workflow/error-types";

/**
 * Execute the sequence of actions defined for a single workflow step.
 *
 * @param action - Action definition to execute
 * @param step - The parent workflow step
 * @param variables - Current workflow variable map
 * @param tokens - Authentication tokens for API requests
 * @param onLog - Callback for emitting log events
 * @param extractedVariables - Object to collect extracted variable values
 * @param workflow - Parsed workflow definition
 * @param _verificationOnly - Flag indicating a verification-only run
 * @returns Result of the action execution and any extracted variables
 */
async function handleActionExecution(
  action: Action,
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
  extractedVariables: Record<string, string>,
  workflow: Workflow,
  _verificationOnly: boolean
): Promise<{
  success: boolean;
  extractedVariables: Record<string, string>;
  data?: unknown;
}> {
  // Check if this is an interactive action that needs user input
  if (action.interactive && !_verificationOnly) {
    const actionIndex = step.actions?.findIndex((a) => a === action) ?? -1;
    const needsInput = await needsInteractiveInput(step.name, actionIndex);
    if (needsInput) {
      return {
        success: false,
        extractedVariables,
        data: { needsInteraction: true, actionIndex },
      };
    }

    if (action.interactive.type === "select-or-create") {
      const existingMarker = `${action.interactive.variable}_existing`;
      if (variables[existingMarker] === "true") {
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Skipping action ${action.use} - existing resource selected`,
        });
        return { success: true, extractedVariables };
      }
    }
  }

  // Check condition if specified
  if (action.condition && !evaluateCondition(action.condition, variables)) {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: `Skipping action ${action.use} - condition not met: ${action.condition}`,
    });
    return { success: true, extractedVariables };
  }
  const endpoint = workflow.endpoints[action.use];
  const prereq = validateActionPrerequisites(
    action,
    endpoint,
    variables,
    onLog
  );
  if (!prereq.isValid || !endpoint) {
    return { success: false, extractedVariables };
  }

  for (const [key, value] of Object.entries(extractedVariables)) {
    variables[key] = value;
  }

  onLog({
    timestamp: Date.now(),
    level: "info",
    message: `[DEBUG] Variables available for ${action.use}: ${Object.keys(variables).join(", ")}`,
  });

  const { payload, capturedValues: generatedCaptures } = prepareActionPayload(
    action,
    variables
  );

  onLog({
    timestamp: Date.now(),
    level: "info",
    message: `Executing action: ${action.use}`,
  });

  const apiResult = await safeAsync(
    () =>
      apiRequest({
        endpoint,
        connections: workflow.connections,
        variables,
        tokens,
        body: payload,
        throwOnMissingVars: !action.fallback,
        onLog,
      }),
    "Failed to execute API request"
  );

  if (!apiResult.success) {
    throw new Error(apiResult.error);
  }

  const { data: response, capturedValues } = apiResult.data;
  const allCapturedValues = { ...capturedValues, ...generatedCaptures };

  const method = endpoint.method;
  const baseUrl = workflow.connections[endpoint.conn].base;
  const fullPath = substituteVariables(endpoint.path, variables);
  const fullUrl = `${baseUrl}${fullPath}`;

  onLog({
    timestamp: Date.now(),
    level: "info",
    message: `${method} ${fullPath}`,
    data: { fullUrl, response },
  });

  const processResult = await processActionResponse(
    action,
    response,
    variables,
    extractedVariables,
    allCapturedValues,
    onLog
  );

  if (!processResult.success) {
    return { success: false, extractedVariables };
  }

  if (areOutputsMissing(step, extractedVariables)) {
    onLog({
      timestamp: Date.now(),
      level: "warn",
      message: `Action succeeded but missing required outputs: ${step.outputs?.join(", ")}`,
    });
    return { success: false, extractedVariables };
  }

  return { success: true, extractedVariables, data: response };
}

/**
 * Execute a workflow step and collect status information.
 */
async function processStepExecution(
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void
): Promise<StepStatus> {
  const status: StepStatus = {
    status: STATUS_VALUES.RUNNING,
    logs: [],
    startedAt: Date.now(),
  };
  const logs: LogEntry[] = [];
  const logCollector = (entry: LogEntry) => {
    logs.push(entry);
    onLog(entry);
  };

  try {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: `Starting step: ${step.name}`,
    });

    if (step.inputs && step.inputs.length > 0) {
      const missingInputs = step.inputs.filter((input) => !variables[input]);
      if (missingInputs.length > 0) {
        throw new Error(
          ERROR_MESSAGES.MISSING_INPUTS(step.name, missingInputs)
        );
      }
    }

    const actionResult = await runStepActions(
      step,
      variables,
      tokens,
      logCollector,
      false
    );
    if (actionResult.needsInteraction) {
      status.needsInteraction = true;
      status.actionIndex = actionResult.actionIndex;
      status.status = STATUS_VALUES.PENDING;
      status.logs = logs;
      return status;
    }
    if (!actionResult.success) {
      throw new Error("Step actions failed");
    }

    Object.assign(variables, actionResult.extractedVariables);
    if (Object.keys(actionResult.extractedVariables).length > 0) {
      status.variables = { ...actionResult.extractedVariables };
    }
    if (
      step.name === STEP_NAMES.CREATE_SERVICE_ACCOUNT
      && variables[VARIABLE_KEYS.GENERATED_PASSWORD]
    ) {
      status.variables = {
        ...(status.variables || {}),
        [VARIABLE_KEYS.GENERATED_PASSWORD]:
          variables[VARIABLE_KEYS.GENERATED_PASSWORD],
      };
    }

    status.result = actionResult.data;
    status.status = STATUS_VALUES.COMPLETED;
    status.completedAt = Date.now();
    status.logs = logs;

    onLog({
      timestamp: Date.now(),
      level: "info",
      message: `Step completed: ${step.name}`,
    });
  } catch (error: unknown) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    let apiError = null;
    const start = errorMessage.indexOf("{");
    const end = errorMessage.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        apiError = JSON.parse(errorMessage.slice(start, end + 1));
        if (apiError.error) {
          errorMessage = `${apiError.error.code}: ${apiError.error.message}`;
        }
      } catch {
        // Ignore JSON parse errors
      }
    }

    status.status = STATUS_VALUES.FAILED;
    status.error = errorMessage;
    status.logs = logs;
    onLog({
      timestamp: Date.now(),
      level: "error",
      message: `Step failed: ${errorMessage}`,
      data: apiError || error,
    });
  }

  return status;
}

/**
 * Execute all actions for a workflow step.
 *
 * @param step - Step definition to execute
 * @param variables - Current workflow variables
 * @param tokens - Authentication tokens
 * @param onLog - Callback for log events
 * @param verificationOnly - Whether to execute only verification actions
 * @returns Result of execution and any extracted variables
 */
export async function runStepActions(
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
  verificationOnly: boolean = false
): Promise<{
  success: boolean;
  extractedVariables: Record<string, string>;
  data?: unknown;
  needsInteraction?: boolean;
  actionIndex?: number;
}> {
  if (!step.actions || step.actions.length === 0) {
    return { success: false, extractedVariables: {} };
  }

  const workflow = parseWorkflow();
  const extractedVariables: Record<string, string> = {};
  const workingVariables = { ...variables };
  const actionsToRun = filterActions(step, verificationOnly);

  let lastData: unknown = undefined;
  let success = false;
  for (const action of actionsToRun) {
    try {
      const result = await handleActionExecution(
        action,
        step,
        workingVariables,
        tokens,
        onLog,
        extractedVariables,
        workflow,
        verificationOnly
      );
      if (result.data && typeof result.data === "object" && "needsInteraction" in result.data) {
        return {
          success: false,
          extractedVariables,
          data: lastData,
          needsInteraction: true,
          actionIndex: (result.data as { actionIndex: number }).actionIndex,
        };
      }
      if (result.success) {
        success = true;
        lastData = result.data;
        Object.assign(workingVariables, result.extractedVariables);
        Object.assign(extractedVariables, result.extractedVariables);
      }
    } catch (error: unknown) {
      const apiError = parseApiError(error);
      let errorMessage = "";
      let needsReauth = false;

      switch (apiError.kind) {
        case "structured":
          errorMessage = apiError.message;
          if (
            apiError.code === WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED
            || apiError.status === "UNAUTHENTICATED"
          ) {
            needsReauth = true;
          }
          break;
        case "text":
          errorMessage = apiError.message;
          break;
        case "unknown":
          errorMessage = "Unknown error";
          break;
        default:
          assertNever(apiError);
      }

      onLog({
        timestamp: Date.now(),
        level: "error",
        message: `Action ${action.use} failed: ${errorMessage}`,
        data: apiError,
      });

      // If this is a fallback action, continue to next action
      if (action.fallback) {
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Fallback action failed, trying next action...`,
        });
        continue;
      }

      // Handle different error types
      if (
        needsReauth
        || errorMessage.includes(
          String(WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED)
        )
        || errorMessage.includes("Authentication expired")
      ) {
        const failedEndpoint = workflow.endpoints[action.use];
        const provider =
          failedEndpoint.conn.includes(CONNECTION_IDENTIFIERS.GOOGLE) ?
            "Google"
          : "Microsoft";
        throw new Error(ERROR_MESSAGES.AUTH_EXPIRED(provider));
      } else if (errorMessage.includes("404") && !verificationOnly) {
        throw new Error(ERROR_MESSAGES.RESOURCE_NOT_FOUND(step.name));
      } else if (errorMessage.includes("404")) {
        success = false;
        break;
      } else {
        throw new Error(errorMessage);
      }
    }
  }

  return { success, extractedVariables, data: lastData };
}

/**
 * Execute a named workflow step and persist any resulting variables.
 *
 * @param stepName - Name of the step to execute
 * @returns Result status and updated variables
 */
export async function executeWorkflowStep(
  stepName: string
): Promise<{
  success: boolean;
  status?: StepStatus;
  variables?: Record<string, string>;
  error?: string;
  needsInteraction?: boolean;
  actionIndex?: number;
}> {
  try {
    // Get current workflow data including reconstructed variables
    const currentData = await getWorkflowData();
    const workflow = currentData.workflow;
    const updatedVariables = { ...currentData.variables };

    // Get tokens
    const googleToken = await getToken(PROVIDERS.GOOGLE);
    const microsoftToken = await getToken(PROVIDERS.MICROSOFT);

    const tokens = {
      google: googleToken ?? undefined,
      microsoft: microsoftToken ?? undefined,
    };

    // Find the step
    const step = workflow.steps.find((s) => s.name === stepName);
    if (!step) {
      return { success: false, error: "Step not found" };
    }

    // Track logs and variables
    const onLog = (log: LogEntry) => {
      console.log(`[LOG] ${log.level.toUpperCase()}: ${log.message}`, log.data);
    };

    const status = await processStepExecution(
      step,
      updatedVariables,
      tokens,
      onLog
    );

    await setStoredVariables(updatedVariables);

    if (status.needsInteraction && status.actionIndex !== undefined) {
      return {
        success: false,
        needsInteraction: true,
        actionIndex: status.actionIndex,
        variables: updatedVariables,
      };
    }

    if (
      status.status === STATUS_VALUES.COMPLETED
      && Object.keys(updatedVariables).length
        > Object.keys(currentData.variables).length
    ) {
      const newVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(updatedVariables)) {
        if (!Object.prototype.hasOwnProperty.call(currentData.variables, key)) {
          newVars[key] = value;
        }
      }
      if (Object.keys(newVars).length > 0) {
        status.variables = newVars;
      }
    }

    // Just refresh the UI state, don't rebuild entire workflow
    await refreshWorkflowState();

    // Invalidate cache to refresh UI
    revalidatePath("/");

    return {
      success: status.status === STATUS_VALUES.COMPLETED,
      status,
      variables: updatedVariables,
    };
  } catch (error) {
    console.error("Step execution failed:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Skip a workflow step
 */
/**
 * Mark the current workflow step as skipped without performing any actions.
 *
 * @returns Whether the skip succeeded
 */
export async function skipWorkflowStep(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Skipping is handled by the UI state only
    // The next getWorkflowData call will still show it as pending/completed based on verification

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to skip step:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Force refresh workflow state
 */
async function refreshWorkflowState(): Promise<void> {
  revalidatePath("/");
}
