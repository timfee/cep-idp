"use server";
import "server-only";

import { makeApiRequest } from "@/app/lib/api/client";
import { getToken } from "@/app/lib/auth/tokens";
import {
  ERROR_MESSAGES,
  PROVIDERS,
  STATUS_VALUES,
  STEP_NAMES,
  VARIABLE_KEYS,
} from "@/app/lib/workflow/constants";
import { serverLogger } from "@/app/lib/workflow/logger";
import {
  LogEntry,
  StepContext,
  StepDefinition,
  StepResult,
  StepStatus,
  Token,
} from "@/app/lib/workflow/types";
import { setStoredVariables } from "@/app/lib/workflow/variables-store";
import { revalidatePath } from "next/cache";

import { getWorkflowData } from "./workflow-data";

// Core action runner – typed step handlers only

/**
 * Executes the typed handler for a single workflow step.
 *
 * The helper sets up a minimal execution context – variable map, API wrapper
 * and logging callback – before delegating to the step's business‐logic
 * handler.  Both verification-only and real execution modes are supported via
 * the `_verificationOnly` flag.
 *
 * @param step - Parsed {@link StepDefinition} containing the handler to run
 * @param variables - Mutable workflow variable map available to the handler
 * @param tokens - OAuth tokens used when the handler makes outbound API calls
 * @param onLog - Log sink allowing the caller to surface structured log
 *   messages in real time
 * @param _verificationOnly - When true, the handler should operate in a dry-run
 *   mode without making mutating API calls
 * @returns Result object including success flag, any variables the handler
 *   extracted and optional raw data for debugging
 */

export async function runStepActions(
  step: StepDefinition,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
  _verificationOnly: boolean = false
): Promise<{
  success: boolean;
  extractedVariables: Record<string, string>;
  data?: unknown;
}> {
  const extractedVars: Record<string, string> = {};

  const apiWrapper: StepContext["api"] = {
    request: async <T = unknown>(
      connection: string,
      method: string,
      path: string,
      options?: { query?: Record<string, string | undefined>; body?: unknown }
    ): Promise<T> => {
      return makeApiRequest<T>({
        connection,
        method,
        path,
        query: options?.query,
        body: options?.body,
        headers: {},
        tokens,
      });
    },
  };

  const ctx: StepContext = {
    vars: { ...variables },
    api: apiWrapper,
    setVars: (updates) => {
      Object.assign(extractedVars, updates);
      Object.assign(variables, updates);
    },
    log: (level: string, message, data) => {
      onLog({
        timestamp: Date.now(),
        level: level as LogEntry["level"],
        message,
        data,
      });
    },
  };

  try {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: `Executing step handler: ${step.name}`,
    });

    const result: StepResult = await step.handler(ctx);

    return {
      success: result.success,
      extractedVariables: extractedVars,
      data: result,
    };
  } catch (error) {
    onLog({
      timestamp: Date.now(),
      level: "error",
      message: `Step handler failed: ${step.name}`,
      data: error,
    });
    return { success: false, extractedVariables: extractedVars };
  }
}

// Execution helpers used by pages & UI components

async function processStepExecution(
  step: StepDefinition,
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

    if (!actionResult.success) {
      throw new Error("Step actions failed");
    }

    // Persist any new variables
    Object.assign(variables, actionResult.extractedVariables);
    if (Object.keys(actionResult.extractedVariables).length > 0) {
      status.variables = { ...actionResult.extractedVariables };
    }

    // Convenience pass-through for generated password variable
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
    const errorMessage = error instanceof Error ? error.message : String(error);

    status.status = STATUS_VALUES.FAILED;
    status.error = errorMessage;
    status.logs = logs;
    status.completedAt = Date.now();

    onLog({
      timestamp: Date.now(),
      level: "error",
      message: `Step failed: ${errorMessage}`,
      data: error,
    });
  }

  return status;
}

// Public API – called from UI components

/**
 * Execute a single workflow step and persist the resulting state.
 *
 * This is the main entry point called by UI components.  It gathers the
 * workflow definition, reconstructs variables and authentication context,
 * dispatches the requested step to {@link runStepActions} and then persists
 * any updates before re-validating the overall workflow state.
 *
 * @param stepName - Human-readable step name as defined in the YAML workflow
 *   file (e.g. `createServiceAccount`)
 * @returns Object describing execution success, new variables and status
 */

export async function executeWorkflowStep(
  stepName: string
): Promise<{
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
      return { success: false, error: "Step not found" };
    }

    // Track logs and variables – use serverLogger on the server
    const onLog = (log: LogEntry) => {
      serverLogger.info(
        `[LOG] ${log.level.toUpperCase()}: ${log.message}`,
        log.data
      );
    };

    const status = await processStepExecution(
      step,
      updatedVariables,
      tokens,
      onLog
    );

    await setStoredVariables(updatedVariables);

    // Invalidate cache to refresh UI
    await refreshWorkflowState();
    revalidatePath("/");

    return {
      success: status.status === STATUS_VALUES.COMPLETED,
      status,
      variables: updatedVariables,
    };
  } catch (error) {
    serverLogger.error("Step execution failed:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Mark the currently running manual step as skipped.
 *
 * Skipping is used when an operator determines that the step is unnecessary –
 * for example because the target resource already exists – and we still want
 * the workflow to advance.
 */

export async function skipWorkflowStep(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Skipping is handled by the UI state only; a render refresh is enough
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    serverLogger.error("Failed to skip step:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Re-compute derived workflow state after a step execution or skip action.
 *
 * The helper calls the dedicated server action in `app/actions/workflow-state`
 * and then triggers Next.js cache re-validation so that UI components receive
 * the up-to-date data on the next render.
 */

export async function refreshWorkflowState(): Promise<void> {
  revalidatePath("/");
}
