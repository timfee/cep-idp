"use server";

import { apiRequest } from "@/app/lib/api/client";
import { getToken } from "@/app/lib/auth/tokens";
import { getWorkflowData } from "./workflow-data";
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
import { COPY_FEEDBACK_DURATION_MS, WORKFLOW_CONSTANTS } from "@/app/lib/workflow/constants";
import { revalidatePath } from "next/cache";

function applyExtracts(
  action: Action,
  response: unknown,
  variables: Record<string, string>,
  extractedVariables: Record<string, string>,
  onLog: (entry: LogEntry) => void,
): void {
  if (!action.extract) return;
  for (const [varName, path] of Object.entries(action.extract)) {
    // Special handling for password display marker
    if (
      varName === "generatedPassword" &&
      path === WORKFLOW_CONSTANTS.PASSWORD_EXTRACTION_KEY
    ) {
      if (variables.generatedPassword) {
        extractedVariables[varName] = variables.generatedPassword;
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Extracted password for display`,
        });
      }
    } else {
      const value = extractValueFromPath(response, path);
      if (value != null) {
        extractedVariables[varName] = String(value);
        variables[varName] = String(value);
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Extracted variable: ${varName} = ${value}`,
        });
      }
    }
  }
}

function areOutputsMissing(step: Step, extracted: Record<string, string>): boolean {
  return !!step.outputs && step.outputs.some((o) => !extracted[o]);
}

interface StructuredApiError {
  error: {
    code: number;
    status?: string;
    message: string;
  };
}

function parseApiError(error: unknown): {
  message: string;
  needsReauth: boolean;
  data: unknown;
} {
  let errorMessage = error instanceof Error ? error.message : String(error);
  let apiError: unknown = null;
  let needsReauth = false;
  try {
    const start = errorMessage.indexOf("{");
    const end = errorMessage.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      apiError = JSON.parse(errorMessage.slice(start, end + 1)) as StructuredApiError;
      if ((apiError as StructuredApiError).error) {
        const err = (apiError as StructuredApiError).error;
        errorMessage = `${err.code}: ${err.message}`;
        if (
          err.code === WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED ||
          err.status === "UNAUTHENTICATED" ||
          err.message?.includes("Token expired")
        ) {
          needsReauth = true;
        }
      }
    }
  } catch {
    // ignore
  }
  return { message: errorMessage, needsReauth, data: apiError ?? error };
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
): Promise<{ success: boolean; extractedVariables: Record<string, string>; data?: unknown }> {
  const endpoint = workflow.endpoints[action.use];
  if (!endpoint) {
    console.error(`Endpoint not found: ${action.use}`);
    return { success: false, extractedVariables };
  }

  for (const [key, value] of Object.entries(extractedVariables)) {
    variables[key] = value;
  }

  console.log(`[DEBUG] Variables available for ${action.use}:`, Object.keys(variables));

  if (endpoint.path && !action.fallback) {
    const missingVars = extractMissingVariables(endpoint.path, variables);
    if (missingVars.length > 0) {
      console.log(
        `Skipping action ${action.use} - missing variables: ${missingVars.join(", ")}`,
      );
      return { success: false, extractedVariables };
    }
  }

  const payload = action.payload
    ? substituteObject(action.payload, variables, {
        throwOnMissing: !action.fallback,
      })
    : undefined;

  onLog({ timestamp: Date.now(), level: "info", message: `Executing action: ${action.use}` });

  const { data: response, capturedValues } = (await apiRequest({
    endpoint,
    connections: workflow.connections,
    variables,
    tokens,
    body: payload,
    throwOnMissingVars: !action.fallback,
  })) as { data: unknown; capturedValues: Record<string, string> };

  const method = endpoint.method;
  const baseUrl = workflow.connections[endpoint.conn].base;
  const fullPath = substituteVariables(endpoint.path, variables);
  const fullUrl = `${baseUrl}${fullPath}`;

  const condensedMessage = `${method} ${fullPath}`;
  const fullResponseData = { fullUrl, response };

  onLog({ timestamp: Date.now(), level: "info", message: condensedMessage, data: fullResponseData });

  if (action.longRunning) {
    onLog({ timestamp: Date.now(), level: "info", message: "Waiting for long-running operation..." });
    await new Promise((resolve) => setTimeout(resolve, COPY_FEEDBACK_DURATION_MS));
  }

  if (action.checker && response !== null) {
    const verified = evaluateChecker(action, response);
    if (!verified && !action.fallback) {
      return { success: false, extractedVariables };
    }
  }

  applyExtracts(action, response, variables, extractedVariables, onLog);
  Object.assign(extractedVariables, capturedValues);
  Object.assign(variables, capturedValues);

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
    status: "running",
    logs: [],
    startedAt: Date.now(),
  };
  const logs: LogEntry[] = [];
  const logCollector = (entry: LogEntry) => {
    logs.push(entry);
    onLog(entry);
  };

  try {
    onLog({ timestamp: Date.now(), level: "info", message: `Starting step: ${step.name}` });

    if (step.inputs && step.inputs.length > 0) {
      const missingInputs = step.inputs.filter((input) => !variables[input]);
      if (missingInputs.length > 0) {
        throw new Error(
          `Cannot execute "${step.name}". Missing required data: ${missingInputs.join(", ")}. Please complete the previous steps first.`,
        );
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
    if (step.name === "Create Service Account for Microsoft" && variables.generatedPassword) {
      status.variables = { ...(status.variables || {}), generatedPassword: variables.generatedPassword };
    }

    status.result = actionResult.data;
    status.status = "completed";
    status.completedAt = Date.now();
    status.logs = logs;

    onLog({ timestamp: Date.now(), level: "info", message: `Step completed: ${step.name}` });
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

    status.status = "failed";
    status.error = errorMessage;
    status.logs = logs;
    onLog({ timestamp: Date.now(), level: "error", message: `Step failed: ${errorMessage}`, data: apiError || error });
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
  const actionsToRun = filterActions(step, verificationOnly);

  for (const action of actionsToRun) {
    try {
      const result = await handleActionExecution(
        action,
        step,
        variables,
        tokens,
        onLog,
        extractedVariables,
        workflow,
        verificationOnly,
      );
      if (result.success) {
        return result;
      }
    } catch (error: unknown) {
      const { message: errorMessage, needsReauth, data } = parseApiError(error);

      onLog({
        timestamp: Date.now(),
        level: "error",
        message: `Action ${action.use} failed: ${errorMessage}`,
        data,
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
        errorMessage.includes(String(WORKFLOW_CONSTANTS.HTTP_STATUS.UNAUTHORIZED)) ||
        errorMessage.includes("Authentication expired")
      ) {
        const failedEndpoint = workflow.endpoints[action.use];
        const provider = failedEndpoint.conn.includes("google") ? "Google" : "Microsoft";
        throw new Error(
          `${provider} authentication expired. Please re-authenticate to continue.`,
        );
      } else if (errorMessage.includes("404") && !verificationOnly) {
        throw new Error(
          `Resource not found for "${step.name}". This usually means a previous step failed to create the required resource.`,
        );
      } else if (errorMessage.includes("404")) {
        return { success: false, extractedVariables };
      } else {
        throw new Error(errorMessage);
      }
    }
  }

  return { success: false, extractedVariables };
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
    const googleToken = await getToken("google");
    const microsoftToken = await getToken("microsoft");

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

    if (
      status.status === "completed" &&
      Object.keys(updatedVariables).length > Object.keys(currentData.variables).length
    ) {
      const newVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(updatedVariables)) {
        if (!currentData.variables[key]) {
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
      success: status.status === "completed",
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
