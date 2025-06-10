"use server";

import { revalidatePath } from "next/cache";
import { parseWorkflow } from "@/app/lib/workflow";
import { getToken, setToken } from "@/app/lib/auth/tokens";
import { refreshAccessToken } from "@/app/lib/auth/oauth";
import { Provider, LogEntry } from "@/app/lib/workflow/constants";

function isValidVariableName(name: string): boolean {
  const workflow = parseWorkflow();
  return Object.prototype.hasOwnProperty.call(workflow.variables, name);
}

function isValidStepName(stepName: string): boolean {
  const workflow = parseWorkflow();
  return workflow.steps.some((s) => s.name === stepName);
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
  onLog?: (entry: LogEntry) => void,
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
    const varDef = workflow.variables[name];

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


export async function refreshAuthToken(
  provider: Provider,
  onLog?: (entry: LogEntry) => void,
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getToken(provider);
    if (token == null) {
      return { success: false, error: "No token found" };
    }

    if (token.refreshToken == null) {
      return { success: false, error: "No refresh token available" };
    }

    const refreshedToken = await refreshAccessToken(provider, token.refreshToken);
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
