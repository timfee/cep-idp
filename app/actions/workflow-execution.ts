"use server";

import { apiRequest } from "@/app/lib/api/client";
import { getToken } from "@/app/lib/auth/tokens";
import { getWorkflowData } from "./workflow-data";
import { setStoredVariables } from "@/app/lib/workflow";
import {
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
  Action,
} from "@/app/lib/workflow";
import {
  COPY_FEEDBACK_DURATION_MS,
  WORKFLOW_CONSTANTS,
  PROVIDERS,
  STATUS_VALUES,
  STEP_NAMES,
  VARIABLE_KEYS,
} from "@/app/lib/workflow/constants";
import { safeAsync } from "@/app/lib/workflow/error-handling";
import { CONNECTION_IDENTIFIERS, ERROR_MESSAGES } from "@/app/lib/workflow/all-constants";
import { revalidatePath } from "next/cache";

function applyExtracts(
  action: Action,
  response: unknown,
  variables: Record<string, string>,
  extractedVariables: Record<string, string>,
  onLog: (entry: LogEntry) => void,
  capturedValues: Record<string, string> = {},
): void {
  if (!action.extract) return;
  for (const [varName, path] of Object.entries(action.extract)) {
    // Special handling for password display marker
    if (
      varName === VARIABLE_KEYS.GENERATED_PASSWORD &&
      path === WORKFLOW_CONSTANTS.PASSWORD_EXTRACTION_KEY
    ) {
      const password =
        capturedValues[VARIABLE_KEYS.GENERATED_PASSWORD] ??
        variables[VARIABLE_KEYS.GENERATED_PASSWORD];
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

function areOutputsMissing(
  step: Step,
  extracted: Record<string, string>,
): boolean {
  return !!step.outputs && step.outputs.some((o) => !extracted[o]);
}



import { ApiError, isStructuredError, assertNever } from "@/app/lib/workflow/error-types";

function parseApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    const message = error.message;
    try {
      const start = message.indexOf("{");
      const end = message.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(message.slice(start, end + 1));
        if (isStructuredError(parsed)) {
          return {
            kind: "structured",
            code: parsed.error.code,
            status: parsed.error.status,
            message: parsed.error.message,
          };
        }
      }
    } catch {
      // Fall through to text error
    }
    return { kind: "text", message };
  }
  return { kind: "unknown", data: error };
}

/**
 * Run actions for a step (simplified approach)
 */
async function handleActionExecution(
  action: Action,
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
  extractedVariables: Record<string, string>,
  workflow: Workflow,
  _verificationOnly: boolean,
): Promise<{
  success: boolean;
  extractedVariables: Record<string, string>;
  data?: unknown;
}> {
  const endpoint = workflow.endpoints[action.use];
  if (!endpoint) {
    onLog({
      timestamp: Date.now(),
      level: "error",
      message: ERROR_MESSAGES.ENDPOINT_NOT_FOUND(action.use),
    });
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

  const missingVars = endpoint.path
    ? extractMissingVariables(endpoint.path, variables)
    : [];
  if (missingVars.length > 0) {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: `Skipping action ${action.use} - missing variables: ${missingVars.join(", ")}`,
    });
    return { success: false, extractedVariables };
  }

  const generatedCaptures: Record<string, string> = {};
  const payload = action.payload
    ? substituteObject(action.payload, variables, {
        throwOnMissing: !action.fallback,
        captureGenerated: generatedCaptures,
      })
    : undefined;

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
    "Failed to execute API request",
  );

  if (!apiResult.success) {
    throw new Error(apiResult.error);
  }

  const { data: response, capturedValues } = apiResult.data;
  const allCapturedValues = {
    ...capturedValues,
    ...generatedCaptures,
  };

  const method = endpoint.method;
  const baseUrl = workflow.connections[endpoint.conn].base;
  const fullPath = substituteVariables(endpoint.path, variables);
  const fullUrl = `${baseUrl}${fullPath}`;

  const condensedMessage = `${method} ${fullPath}`;
  const fullResponseData = { fullUrl, response };

  onLog({
    timestamp: Date.now(),
    level: "info",
    message: condensedMessage,
    data: fullResponseData,
  });

  if (action.longRunning) {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: "Waiting for long-running operation...",
    });
    await new Promise((resolve) =>
      setTimeout(resolve, COPY_FEEDBACK_DURATION_MS),
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
    allCapturedValues,
  );

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

async function processStepExecution(
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
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
        throw new Error(ERROR_MESSAGES.MISSING_INPUTS(step.name, missingInputs));
      }
    }

    const actionResult = await runStepActions(
      step,
      variables,
      tokens,
      logCollector,
      false,
    );
    if (!actionResult.success) {
      throw new Error("Step actions failed");
    }

    Object.assign(variables, actionResult.extractedVariables);
    if (Object.keys(actionResult.extractedVariables).length > 0) {
      status.variables = { ...actionResult.extractedVariables };
    }
    if (
      step.name === STEP_NAMES.CREATE_SERVICE_ACCOUNT &&
      variables[VARIABLE_KEYS.GENERATED_PASSWORD]
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

export async function runStepActions(
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
  verificationOnly: boolean = false,
): Promise<{
  success: boolean;
  extractedVariables: Record<string, string>;
  data?: unknown;
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
        verificationOnly,
      );
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
            apiError.code === WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED ||
            apiError.status === "UNAUTHENTICATED"
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
        needsReauth ||
        errorMessage.includes(
          String(WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED),
        ) ||
        errorMessage.includes("Authentication expired")
      ) {
        const failedEndpoint = workflow.endpoints[action.use];
        const provider = failedEndpoint.conn.includes(CONNECTION_IDENTIFIERS.GOOGLE)
          ? "Google"
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
 * Execute a workflow step
 */
export async function executeWorkflowStep(stepName: string): Promise<{
  success: boolean;
  status?: StepStatus;
  variables?: Record<string, string>;
  error?: string;
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
      return {
        success: false,
        error: "Step not found",
      };
    }

    // Track logs and variables
    const onLog = (log: LogEntry) => {
      console.log(`[LOG] ${log.level.toUpperCase()}: ${log.message}`, log.data);
    };

    const status = await processStepExecution(
      step,
      updatedVariables,
      tokens,
      onLog,
    );

    await setStoredVariables(updatedVariables);

    if (
      status.status === STATUS_VALUES.COMPLETED &&
      Object.keys(updatedVariables).length >
        Object.keys(currentData.variables).length
    ) {
      const newVars: Record<string, string> = {};
        for (const [key, value] of Object.entries(updatedVariables)) {
          if (
            !Object.prototype.hasOwnProperty.call(currentData.variables, key)
          ) {
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
