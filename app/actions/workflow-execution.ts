"use server";

import { apiRequest } from "@/app/lib/api/client";
import { getToken } from "@/app/lib/auth/tokens";
import {
  evaluateChecker,
  evaluateGenerator,
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
import { COPY_FEEDBACK_DURATION_MS } from "@/app/lib/workflow/constants";
import { revalidatePath } from "next/cache";
import {
  getGlobalVariables,
  updateGlobalStepStatus,
  updateGlobalVariable,
} from "./workflow-state";

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
  verificationOnly: boolean,
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

  const response = await apiRequest({
    endpoint,
    connections: workflow.connections,
    variables,
    tokens,
    body: payload,
    throwOnMissingVars: !action.fallback,
  });

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

  if (action.extract) {
    for (const [varName, path] of Object.entries(action.extract)) {
      const value = extractValueFromPath(response, path);
      if (value != null) {
        extractedVariables[varName] = String(value);
        variables[varName] = String(value);
        onLog({ timestamp: Date.now(), level: "info", message: `Extracted variable: ${varName} = ${value}` });
      }
    }
  }

  if (step.outputs && step.outputs.length > 0) {
    const missingOutputs = step.outputs.filter((output) => !extractedVariables[output]);
    if (missingOutputs.length > 0) {
      onLog({
        timestamp: Date.now(),
        level: "warn",
        message: `Action succeeded but missing required outputs: ${missingOutputs.join(", ")} - continuing to fallback actions`,
      });
      return { success: false, extractedVariables };
    }
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
    for (const [key, value] of Object.entries(actionResult.extractedVariables)) {
      await updateGlobalVariable(key, value);
    }

    status.result = actionResult.data;
    status.status = "completed";
    status.completedAt = Date.now();
    status.logs = logs;

    onLog({ timestamp: Date.now(), level: "info", message: `Step completed: ${step.name}` });
    await updateGlobalStepStatus(step.name, status);
  } catch (error: unknown) {
    let errorMessage = error instanceof Error ? error.message : String(error);
    let apiError = null;
    if (errorMessage.includes("{") && errorMessage.includes("}")) {
      const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        apiError = JSON.parse(jsonMatch[0]);
        if (apiError.error) {
          errorMessage = `${apiError.error.code}: ${apiError.error.message}`;
        }
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
      // Parse API error details
      let errorMessage = error instanceof Error ? error.message : String(error);
      let apiError = null;

      // Try to extract structured API error
      try {
        if (errorMessage.includes("{") && errorMessage.includes("}")) {
          const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            apiError = JSON.parse(jsonMatch[0]);
            if (apiError.error) {
              errorMessage = `${apiError.error.code}: ${apiError.error.message}`;
            }
          }
        }
      } catch {
        // Keep original error message if parsing fails
      }

      // Log the detailed error
      onLog({
        timestamp: Date.now(),
        level: "error",
        message: `Action ${action.use} failed: ${errorMessage}`,
        data: apiError || error,
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
      if (errorMessage.includes("401")) {
        throw new Error(
          `Authentication failed for "${step.name}". Please re-authenticate with ${
            endpoint.conn.includes("google") ? "Google" : "Microsoft"
          }.`,
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
    // Get workflow and current variables directly without rebuilding entire state
    const workflow = parseWorkflow();
    const updatedVariables = { ...(await getGlobalVariables()) };

    // Initialize variables with defaults if not already set
    for (const [name, varDef] of Object.entries(workflow.variables)) {
      if (!updatedVariables[name]) {
        if (varDef.default) {
          updatedVariables[name] = varDef.default;
        } else if (varDef.generator) {
          updatedVariables[name] = evaluateGenerator(varDef.generator);
        }
      }
    }

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
    const logs: LogEntry[] = [];
    const onLog = (log: LogEntry) => {
      logs.push(log);
      console.log(`[LOG] ${log.level.toUpperCase()}: ${log.message}`, log.data);
    };

    const status = await processStepExecution(
      step,
      updatedVariables,
      tokens,
      onLog,
    );

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
