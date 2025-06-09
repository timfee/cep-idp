"use server";

import { revalidatePath } from "next/cache";
import { getToken } from "@/app/lib/auth/tokens";
import {
  parseWorkflow,
  extractValueFromPath,
  substituteVariables,
  substituteObject,
  evaluateChecker,
  extractMissingVariables,
  evaluateGenerator,
  Workflow,
  Step,
  StepStatus,
  LogEntry,
  Token,
} from "@/app/lib/workflow";
import { apiClient } from "@/app/lib/api-client";
import {
  updateGlobalVariable,
  updateGlobalStepStatus,
  getGlobalVariables,
} from "./workflow-state";

/**
 * Run actions for a step (simplified approach)
 */
async function runStepActions(
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
  let lastResponse: unknown;

  // Filter actions based on mode
  const actionsToRun = verificationOnly 
    ? step.actions.filter(action => !action.fallback)
    : step.actions;

  // Try each action in sequence
  for (const action of actionsToRun) {
    try {
      const endpoint = workflow.endpoints[action.use];
      if (!endpoint) {
        console.error(`Endpoint not found: ${action.use}`);
        continue;
      }

      // Skip action if required variables are missing (unless it's a fallback)
      if (endpoint.path && !action.fallback) {
        const missingVars = extractMissingVariables(endpoint.path, variables);
        if (missingVars.length > 0) {
          console.log(
            `Skipping action ${action.use} - missing variables: ${missingVars.join(', ')}`
          );
          continue;
        }
      }

      // Substitute variables in payload
      const payload = action.payload
        ? substituteObject(action.payload, variables, { throwOnMissing: !action.fallback })
        : undefined;

      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Executing action: ${action.use}`,
      });

      const response = await apiClient.request(
        endpoint,
        workflow.connections,
        variables,
        tokens,
        payload,
        { throwOnMissingVars: !action.fallback },
      );

      lastResponse = response;

      // Log the API response for debugging
      const method = endpoint.method;
      const baseUrl = workflow.connections[endpoint.conn].base;
      const fullPath = substituteVariables(endpoint.path, variables);
      const fullUrl = `${baseUrl}${fullPath}`;
      
      // Create condensed API block with method + path
      const condensedMessage = `${method} ${fullPath}`;
      const fullResponseData = {
        fullUrl,
        response
      };
      
      onLog({
        timestamp: Date.now(),
        level: "info",
        message: condensedMessage,
        data: fullResponseData,
      });

      // Handle long-running operations
      if (action.longRunning) {
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: "Waiting for long-running operation...",
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // If this is a verification action, check if it passes
      if (action.checker && response !== null) {
        const verified = evaluateChecker(action, response, variables);
        if (!verified && !action.fallback) {
          // Verification failed, continue to fallback actions
          continue;
        }
      }

      // Extract variables from response
      if (action.extract) {
        for (const [varName, path] of Object.entries(action.extract)) {
          const value = extractValueFromPath(response, path);
          if (value != null) {
            extractedVariables[varName] = String(value);
            onLog({
              timestamp: Date.now(),
              level: "info",
              message: `Extracted variable: ${varName} = ${value}`,
            });
          }
        }
      }

      // If we got here and didn't throw, the action succeeded
      // But also check if required outputs were extracted
      if (step.outputs && step.outputs.length > 0) {
        const missingOutputs = step.outputs.filter(output => !extractedVariables[output]);
        if (missingOutputs.length > 0) {
          onLog({
            timestamp: Date.now(),
            level: "warn",
            message: `Action succeeded but missing required outputs: ${missingOutputs.join(', ')} - continuing to fallback actions`,
          });
          // Continue to next action (fallback) instead of returning success
          continue;
        }
      }

      return {
        success: true,
        extractedVariables,
        data: lastResponse,
      };

    } catch (error: unknown) {
      // Parse API error details
      let errorMessage = error instanceof Error ? error.message : String(error);
      let apiError = null;
      
      // Try to extract structured API error
      try {
        if (errorMessage.includes('{') && errorMessage.includes('}')) {
          const jsonMatch = errorMessage.match(/\{.*\}/s);
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
        throw new Error(`Authentication failed: ${errorMessage}`);
      } else if (errorMessage.includes("404")) {
        // 404 is expected when resource doesn't exist
        if (verificationOnly) {
          // During verification, 404 means step is pending
          return { success: false, extractedVariables };
        } else {
          // During execution, continue to fallback actions
          continue;
        }
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
  console.log(`[DEBUG] executeWorkflowStep called for: ${stepName}`);
  try {
    // Get workflow and current variables directly without rebuilding entire state
    const workflow = parseWorkflow();
    const updatedVariables = { ...await getGlobalVariables() };

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
      console.log(`[DEBUG] Step not found: ${stepName}`);
      return {
        success: false,
        error: "Step not found",
      };
    }

    console.log(`[DEBUG] Found step: ${step.name}, starting execution`);

    // Track logs and variables
    const logs: LogEntry[] = [];
    const onLog = (log: LogEntry) => {
      console.log(`[DEBUG] Log entry: ${log.level} - ${log.message}`);
      logs.push(log);
    };

    const status: StepStatus = {
      status: "running",
      logs: [],
      startedAt: Date.now(),
    };

    console.log(`[DEBUG] Initial status created: running`);

    try {
      console.log(`[DEBUG] Starting try block for step: ${stepName}`);
      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Starting step: ${stepName}`,
      });

      // Check if step has required inputs
      if (step.inputs && step.inputs.length > 0) {
        const missingInputs = step.inputs.filter(input => !updatedVariables[input]);
        if (missingInputs.length > 0) {
          console.log(`[DEBUG] Missing inputs detected: ${missingInputs.join(', ')}`);
          throw new Error(`Missing required inputs: ${missingInputs.join(', ')}`);
        }
      }

      console.log(`[DEBUG] About to run step actions for: ${stepName}`);
      // Run step actions (including fallbacks)
      const actionResult = await runStepActions(
        step,
        updatedVariables,
        tokens,
        onLog,
        false // full execution mode
      );

      console.log(`[DEBUG] Action result for ${stepName}:`, actionResult);

      if (!actionResult.success) {
        console.log(`[DEBUG] Action result failed for ${stepName}, throwing error`);
        throw new Error("Step actions failed");
      }

      // Update variables with extracted values
      Object.assign(updatedVariables, actionResult.extractedVariables);
      
      // Persist variables globally
      for (const [key, value] of Object.entries(actionResult.extractedVariables)) {
        await updateGlobalVariable(key, value);
      }

      status.result = actionResult.data;

      console.log(`[DEBUG] Step actions succeeded for ${stepName}, marking as completed`);
      status.status = "completed";
      status.completedAt = Date.now();
      status.logs = logs;

      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Step completed: ${stepName}`,
      });

      console.log(`[DEBUG] About to persist completed status for ${stepName}`);
      // Persist step completion globally
      await updateGlobalStepStatus(stepName, status);
      console.log(`[DEBUG] Persisted completed status for ${stepName}`);
    } catch (error: unknown) {
      console.log(`[DEBUG] CAUGHT ERROR in executeWorkflowStep for ${stepName}:`, error);
      
      // Parse API error details
      let errorMessage = error instanceof Error ? error.message : "Unknown error";
      let apiError = null;
      
      console.log(`[DEBUG] Initial error message: ${errorMessage}`);
      
      // Try to extract structured API error
      try {
        if (errorMessage.includes('{') && errorMessage.includes('}')) {
          const jsonMatch = errorMessage.match(/\{.*\}/s);
          if (jsonMatch) {
            apiError = JSON.parse(jsonMatch[0]);
            if (apiError.error) {
              errorMessage = `${apiError.error.code}: ${apiError.error.message}`;
              console.log(`[DEBUG] Parsed API error: ${errorMessage}`);
            }
          }
        }
      } catch (parseError) {
        console.log(`[DEBUG] Failed to parse API error:`, parseError);
        // Keep original error message if parsing fails
      }

      console.log(`[DEBUG] Adding error log for ${stepName}`);
      onLog({
        timestamp: Date.now(),
        level: "error",
        message: `Step failed: ${status.error}`,
        data: error,
      });
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
export async function skipWorkflowStep(stepName: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Skipping is handled by the UI state only
    // The next getWorkflowData call will still show it as pending/completed based on verification
    console.log(`Skipping step: ${stepName}`);

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

