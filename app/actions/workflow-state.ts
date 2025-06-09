"use server";

import { revalidatePath } from "next/cache";
import { StepStatus, parseWorkflow } from "@/app/lib/workflow";

function isValidVariableName(name: string): boolean {
  const workflow = parseWorkflow();
  return Object.prototype.hasOwnProperty.call(workflow.variables, name);
}

function isValidStepName(stepName: string): boolean {
  const workflow = parseWorkflow();
  return workflow.steps.some((s) => s.name === stepName);
}

// Global variable state - persisted across requests (NOTE: This resets on server restart)
let globalVariables = new Map<string, string>();
let globalStepStatuses = new Map<string, StepStatus>();

/**
 * Update global variable state
 */
export async function updateGlobalVariable(
  name: string,
  value: string,
): Promise<void> {
  if (isValidVariableName(name)) {
    globalVariables.set(name, value);
  }
}

/**
 * Update global step status
 */
export async function updateGlobalStepStatus(
  stepName: string,
  status: StepStatus,
): Promise<void> {
  if (isValidStepName(stepName)) {
    globalStepStatuses.set(stepName, {
      ...status,
      variables: Object.fromEntries(globalVariables),
    });
  }
}

/**
 * Get global variables
 */
export async function getGlobalVariables(): Promise<Record<string, string>> {
  return Object.fromEntries(globalVariables);
}

/**
 * Get global step status
 */
export async function getGlobalStepStatus(
  stepName: string,
): Promise<StepStatus | undefined> {
  if (isValidStepName(stepName)) {
    return globalStepStatuses.get(stepName);
  }
  return undefined;
}

/**
 * Get all global step statuses
 */
export async function getAllGlobalStepStatuses(): Promise<
  Record<string, StepStatus>
> {
  return Object.fromEntries(globalStepStatuses);
}

/**
 * Clear all global state (useful for testing)
 */
export async function clearGlobalState(): Promise<void> {
  globalVariables = new Map();
  globalStepStatuses = new Map();
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
    if (!Object.prototype.hasOwnProperty.call(workflow.variables, name)) {
      return {
        success: false,
        error: `Variable '${name}' is not defined in the workflow`,
      };
    }
    const varDef = workflow.variables[name as keyof typeof workflow.variables];

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
    globalVariables = new Map();
    globalStepStatuses = new Map();
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
