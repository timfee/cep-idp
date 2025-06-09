"use server";

import { revalidatePath } from "next/cache";
import { StepStatus, parseWorkflow } from "@/app/lib/workflow";

// Global variable state - persisted across requests (NOTE: This resets on server restart)
let globalVariables: Record<string, string> = {};
let globalStepStatuses: Record<string, StepStatus> = {};

// TODO: For production, this should be persisted to a database or cache like Redis

/**
 * Update global variable state
 */
export async function updateGlobalVariable(
  name: string,
  value: string,
): Promise<void> {
  globalVariables[name] = value;
}

/**
 * Update global step status
 */
export async function updateGlobalStepStatus(
  stepName: string,
  status: StepStatus,
): Promise<void> {
  globalStepStatuses[stepName] = { ...status, variables: globalVariables };
}

/**
 * Get global variables
 */
export async function getGlobalVariables(): Promise<Record<string, string>> {
  return { ...globalVariables };
}

/**
 * Get global step status
 */
export async function getGlobalStepStatus(
  stepName: string,
): Promise<StepStatus | undefined> {
  return globalStepStatuses[stepName];
}

/**
 * Get all global step statuses
 */
export async function getAllGlobalStepStatuses(): Promise<
  Record<string, StepStatus>
> {
  return { ...globalStepStatuses };
}

/**
 * Clear all global state (useful for testing)
 */
export async function clearGlobalState(): Promise<void> {
  globalVariables = {};
  globalStepStatuses = {};
  revalidatePath("/");
}

/**
 * Force refresh workflow state
 */
export async function refreshWorkflowState(): Promise<void> {
  revalidatePath("/");
}

/**
 * Set a workflow variable with validation
 */
export async function setWorkflowVariable(
  name: string,
  value: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { validateVariable } = await import("@/app/lib/workflow");
    const workflow = parseWorkflow();

    // Check if variable exists in workflow
    const varDef = workflow.variables[name];
    if (!varDef) {
      return {
        success: false,
        error: `Variable '${name}' is not defined in the workflow`,
      };
    }

    // Validate the value if validator is defined
    if (varDef.validator) {
      const isValid = validateVariable(value, varDef.validator);
      if (!isValid) {
        return {
          success: false,
          error: `Value '${value}' does not match the required format for '${name}'`,
        };
      }
    }

    // Update the global variable
    await updateGlobalVariable(name, value);

    // Variable is valid, invalidate cache to refresh UI
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to set variable:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function clearWorkflowState(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    globalVariables = {};
    globalStepStatuses = {};
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
