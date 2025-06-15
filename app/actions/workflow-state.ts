"use server";
import "server-only";

import { refreshAccessToken } from "@/app/lib/auth/oauth";
import { getToken, setToken } from "@/app/lib/auth/tokens";
import { assembleWorkflow } from "@/app/lib/workflow";
import { Provider } from "@/app/lib/workflow/constants";
import type { LogEntry } from "@/app/lib/workflow/types";
import {
  getStoredVariables,
  setStoredVariables,
} from "@/app/lib/workflow/variables-store";
import { timingSafeEqual } from "crypto";
import { revalidatePath } from "next/cache";

/**
 * Force a UI revalidation of workflow state.
 *
 * @returns A promise that resolves once the cache is invalidated
 */
export async function refreshWorkflowState(): Promise<void> {
  revalidatePath("/");
}

/**
 * Set a workflow variable with validation
 */
/**
 * Persist a workflow variable after validating its value.
 *
 * @param name - Workflow variable name
 * @param value - Value to store
 * @param onLog - Optional log handler
 * @returns Success status and optional error message
 */
export async function setWorkflowVariable(
  name: string,
  value: string,
  onLog?: (entry: LogEntry) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    // Lazy-load the relatively heavy workflow engine only when this server
    // action is executed so that the default Edge bundle remains small and the
    // module graph stays free of circular dependencies.
    const { validateVariable } = await import("@/app/lib/workflow");
    const workflow = assembleWorkflow();

    // Check if variable exists in workflow
    const varNames = Object.keys(workflow.variables);
    const nameBuffer = Buffer.from(name);
    const isValid = varNames.some((varName) => {
      const varNameBuffer = Buffer.from(varName);
      return (
        nameBuffer.length === varNameBuffer.length
        && timingSafeEqual(nameBuffer, varNameBuffer)
      );
    });
    if (!isValid) {
      return {
        success: false,
        error: `Variable '${name}' is not defined in the workflow`,
      };
    }
    const varDef = workflow.variables[name];

    // Validate the value if validator is defined
    if (varDef.validator) {
      const isValid = validateVariable(
        value,
        varDef.validator as RegExp | undefined
      );
      if (!isValid) {
        return {
          success: false,
          error: `Value '${value}' does not match the required format for '${name}'`,
        };
      }
    }

    const vars = await getStoredVariables(onLog);
    vars[name] = value;
    await setStoredVariables(vars, onLog);

    // Variable is valid, invalidate cache to refresh UI
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: "Failed to set variable",
      data: error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Refresh an OAuth access token if possible.
 *
 * @param provider - Which OAuth provider to refresh
 * @param onLog - Optional log callback
 * @returns Success flag and optional error
 */
export async function refreshAuthToken(
  provider: Provider,
  onLog?: (entry: LogEntry) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken(provider);
    if (!token) {
      return { success: false, error: "No token found" };
    }

    if (!token.refreshToken) {
      return { success: false, error: "No refresh token available" };
    }

    const refreshedToken = await refreshAccessToken(
      provider,
      token.refreshToken
    );
    await setToken(provider, refreshedToken);

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    onLog?.({
      timestamp: Date.now(),
      level: "error",
      message: `Failed to refresh ${provider} token`,
      data: error,
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Record that a manual step has been completed by the user.
 *
 * @param stepName - Name of the manual step
 */
export async function markManualStepComplete(stepName: string): Promise<void> {
  const vars = await getStoredVariables();
  const state =
    vars.manualStepsState ?
      JSON.parse(vars.manualStepsState)
    : ({ completed: [], completedAt: {} } as {
        completed: string[];
        completedAt: Record<string, number>;
      });

  if (!state.completed.includes(stepName)) {
    state.completed.push(stepName);
    state.completedAt[stepName] = Date.now();
  }

  vars.manualStepsState = JSON.stringify(state);
  await setStoredVariables(vars);
  revalidatePath("/");
}
