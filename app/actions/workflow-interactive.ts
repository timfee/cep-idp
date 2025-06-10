"use server";
import "server-only";

import { apiRequest } from "@/app/lib/api/client";
import { getToken } from "@/app/lib/auth/tokens";
import {
  extractValueFromPath,
  parseWorkflow,
  InteractiveRequest,
  InteractiveResponse,
} from "@/app/lib/workflow";
import { PROVIDERS } from "@/app/lib/workflow/constants";
import { getStoredVariables, setStoredVariables } from "@/app/lib/workflow/variables-store";

/**
 * Build an {@link InteractiveRequest} describing the user input required for
 * an interactive workflow action.
 *
 * @param stepName - Name of the workflow step containing the action
 * @param actionIndex - Index of the interactive action within the step
 * @returns The request configuration or `null` if the action is invalid
 */
export async function prepareInteractiveRequest(
  stepName: string,
  actionIndex: number
): Promise<InteractiveRequest | null> {
  const workflow = parseWorkflow();
  const step = workflow.steps.find((s) => s.name === stepName);
  if (!step || !step.actions || !step.actions[actionIndex]) {
    return null;
  }

  const action = step.actions[actionIndex];
  if (!action.interactive) {
    return null;
  }

  const variables = await getStoredVariables();
  const config = action.interactive;
  let options: Array<{ name: string; value: string }> = [];

  // Fetch existing options if needed
  if (config.extractOptions && config.type !== "create") {
    const googleToken = await getToken(PROVIDERS.GOOGLE);
    const microsoftToken = await getToken(PROVIDERS.MICROSOFT);
    const tokens = {
      google: googleToken ?? undefined,
      microsoft: microsoftToken ?? undefined,
    };

    const endpoint = workflow.endpoints[action.use];
    if (endpoint) {
      try {
        const apiResult = await apiRequest({
          endpoint,
          connections: workflow.connections,
          variables,
          tokens,
          throwOnMissingVars: false,
          onLog: (log) => console.log(log),
        });

        if (apiResult.data) {
          const extracted = extractValueFromPath(apiResult.data, config.extractOptions);
          if (Array.isArray(extracted)) {
            options = extracted.map((item: unknown) => {
              if (typeof item === "string") {
                return { name: item, value: item };
              }
              if (item && typeof item === "object") {
                const obj = item as Record<string, unknown>;
                return {
                  name:
                    (obj.name as string) ||
                    (obj.value as string) ||
                    String(item),
                  value:
                    (obj.value as string) ||
                    (obj.name as string) ||
                    String(item),
                };
              }
              return { name: String(item), value: String(item) };
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch options:", error);
      }
    }
  }

  return {
    stepName,
    actionIndex,
    config,
    options,
  };
}

/**
 * Persist a user's response for an interactive action.
 *
 * @param stepName - Name of the workflow step
 * @param actionIndex - Index of the action within the step
 * @param response - User supplied value and optional metadata
 * @returns Result indicating success or an error message
 */
export async function handleInteractiveResponse(
  stepName: string,
  actionIndex: number,
  response: InteractiveResponse
): Promise<{ success: boolean; error?: string }> {
  try {
    const variables = await getStoredVariables();
    const workflow = parseWorkflow();
    const step = workflow.steps.find((s) => s.name === stepName);

    if (!step || !step.actions || !step.actions[actionIndex]) {
      return { success: false, error: "Invalid step or action" };
    }

    const action = step.actions[actionIndex];
    if (!action.interactive) {
      return { success: false, error: "Action is not interactive" };
    }

    // Store the response value
    variables[action.interactive.variable] = response.value;

    // Store metadata
    if (response.metadata) {
      Object.assign(variables, response.metadata);
    }

    // Mark the interactive step as completed
    variables[`${stepName}_interactive_${actionIndex}`] = "completed";

    await setStoredVariables(variables);

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Determine whether a given interactive action still requires input from the
 * user.
 *
 * @param stepName - Step containing the action
 * @param actionIndex - Index of the action within the step
 * @returns `true` if input is needed, otherwise `false`
 */
export async function needsInteractiveInput(
  stepName: string,
  actionIndex: number
): Promise<boolean> {
  const variables = await getStoredVariables();
  return !variables[`${stepName}_interactive_${actionIndex}`];
}
