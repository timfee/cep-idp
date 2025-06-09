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
} from "@/app/lib/workflow";
import { revalidatePath } from "next/cache";
import {
  getGlobalVariables,
  updateGlobalStepStatus,
  updateGlobalVariable,
} from "./workflow-state";

/**
 * Run actions for a step (simplified approach)
 */
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
  let lastResponse: unknown;

  // Filter actions based on mode using engine utility
  const actionsToRun = filterActions(step, verificationOnly);

  // Try each action in sequence
  for (const action of actionsToRun) {
    try {
      const endpoint = workflow.endpoints[action.use];
      if (!endpoint) {
        console.error(`Endpoint not found: ${action.use}`);
        continue;
      }

      // Merge any previously extracted variables into current variables before payload substitution
      for (const [key, value] of Object.entries(extractedVariables)) {
        variables[key] = value;
      }

      console.log(
        `[DEBUG] Variables available for ${action.use}:`,
        Object.keys(variables),
      );

      // Skip action if required variables are missing (unless it's a fallback)
      if (endpoint.path && !action.fallback) {
        const missingVars = extractMissingVariables(endpoint.path, variables);
        if (missingVars.length > 0) {
          console.log(
            `Skipping action ${action.use} - missing variables: ${missingVars.join(", ")}`,
          );
          continue;
        }
      }

      // Substitute variables in payload
      const payload = action.payload
        ? substituteObject(action.payload, variables, {
            throwOnMissing: !action.fallback,
          })
        : undefined;

      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Executing action: ${action.use}`,
      });

      const response = await apiRequest({
        endpoint,
        connections: workflow.connections,
        variables,
        tokens,
        body: payload,
        throwOnMissingVars: !action.fallback,
      });

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
        response,
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
        const verified = evaluateChecker(action, response);
        if (!verified && !action.fallback) {
          // Verification failed, continue to fallback actions
          continue;
        }
      }

      // Extract variables from response
      if (action.extract) {
        // Add debug logging for Custom admin role step
        if (step.name === "Custom admin role") {
          onLog({
            timestamp: Date.now(),
            level: "info",
            message: `[DEBUG] Custom admin role response from ${action.use}:`,
            data: response,
          });

          // Log the response structure
          if (response && typeof response === "object") {
            const responseObj = response as Record<string, unknown>;
            onLog({
              timestamp: Date.now(),
              level: "info",
              message: `[DEBUG] Response keys: ${Object.keys(responseObj).join(", ")}`,
            });

            if ("items" in responseObj && Array.isArray(responseObj.items)) {
              onLog({
                timestamp: Date.now(),
                level: "info",
                message: `[DEBUG] Found ${responseObj.items.length} items in response`,
              });

              if (action.use === "admin.listPrivileges") {
                // Special debug for privileges API
                onLog({
                  timestamp: Date.now(),
                  level: "info",
                  message: `[DEBUG] PRIVILEGES API - Looking for serviceName='Admin Directory API'`,
                });

                responseObj.items.forEach((item: unknown, index: number) => {
                  if (item && typeof item === "object") {
                    const itemObj = item as Record<string, unknown>;
                    onLog({
                      timestamp: Date.now(),
                      level: "info",
                      message: `[DEBUG] Privilege ${index}: serviceName="${itemObj.serviceName}", serviceId="${itemObj.serviceId}", privilegeName="${itemObj.privilegeName}"`,
                    });
                  }
                });

                // Check if Admin Directory API service exists
                const adminDirService = responseObj.items.find(
                  (item: unknown) =>
                    item &&
                    typeof item === "object" &&
                    "serviceName" in item &&
                    (item as Record<string, unknown>).serviceName ===
                      "Admin Directory API",
                );

                if (adminDirService) {
                  onLog({
                    timestamp: Date.now(),
                    level: "info",
                    message: `[DEBUG] FOUND Admin Directory API service:`,
                    data: adminDirService,
                  });
                } else {
                  onLog({
                    timestamp: Date.now(),
                    level: "warn",
                    message: `[DEBUG] Admin Directory API service NOT FOUND in privileges list!`,
                  });

                  // Log all available service names
                  const serviceNames = responseObj.items
                    .map((item: unknown) =>
                      item && typeof item === "object" && "serviceName" in item
                        ? (item as Record<string, unknown>).serviceName
                        : null,
                    )
                    .filter(Boolean);
                  onLog({
                    timestamp: Date.now(),
                    level: "info",
                    message: `[DEBUG] Available service names: ${serviceNames.join(", ")}`,
                  });
                }
              } else if (action.use === "admin.listRoles") {
                responseObj.items.forEach((item: unknown, index: number) => {
                  if (item && typeof item === "object") {
                    const itemObj = item as Record<string, unknown>;
                    onLog({
                      timestamp: Date.now(),
                      level: "info",
                      message: `[DEBUG] Item ${index}: roleName="${itemObj.roleName}", roleId="${itemObj.roleId}"`,
                    });
                  }
                });
              }
            } else {
              onLog({
                timestamp: Date.now(),
                level: "warn",
                message: `[DEBUG] No 'items' array found in response or items is not an array`,
              });
            }
          }
        }

        for (const [varName, path] of Object.entries(action.extract)) {
          if (step.name === "Custom admin role") {
            onLog({
              timestamp: Date.now(),
              level: "info",
              message: `[DEBUG] Extracting ${varName} from path: ${path}`,
            });

            // Additional debug for JSONPath extraction
            if (path.includes("$.items[?(@.roleName==")) {
              onLog({
                timestamp: Date.now(),
                level: "info",
                message: `[DEBUG] This is a JSONPath filter query, checking for specific role name`,
              });

              if (
                response &&
                typeof response === "object" &&
                "items" in response
              ) {
                const items = (response as Record<string, unknown>).items;
                if (Array.isArray(items)) {
                  const roleNames = items
                    .map((item: unknown) =>
                      item && typeof item === "object" && "roleName" in item
                        ? (item as Record<string, unknown>).roleName ||
                          "undefined"
                        : "undefined",
                    )
                    .join(", ");
                  onLog({
                    timestamp: Date.now(),
                    level: "info",
                    message: `[DEBUG] Available role names: [${roleNames}]`,
                  });

                  // Check if the specific role exists
                  const targetRole = items.find(
                    (item: unknown) =>
                      item &&
                      typeof item === "object" &&
                      "roleName" in item &&
                      (item as Record<string, unknown>).roleName ===
                        "Microsoft Entra Provisioning",
                  );
                  if (targetRole) {
                    onLog({
                      timestamp: Date.now(),
                      level: "info",
                      message: `[DEBUG] Found target role: ${JSON.stringify(targetRole)}`,
                    });
                  } else {
                    onLog({
                      timestamp: Date.now(),
                      level: "warn",
                      message: `[DEBUG] Target role 'Microsoft Entra Provisioning' not found in items`,
                    });
                  }
                }
              }
            }
          }

          const value = extractValueFromPath(response, path);

          if (step.name === "Custom admin role") {
            onLog({
              timestamp: Date.now(),
              level: "info",
              message: `[DEBUG] Extracted value for ${varName}: ${value}`,
            });
          }

          if (value != null) {
            extractedVariables[varName] = String(value);
            // Also merge into current variables for next action
            variables[varName] = String(value);
            onLog({
              timestamp: Date.now(),
              level: "info",
              message: `Extracted variable: ${varName} = ${value}`,
            });
          } else if (step.name === "Custom admin role") {
            onLog({
              timestamp: Date.now(),
              level: "warn",
              message: `[DEBUG] Failed to extract ${varName} from path ${path}`,
            });
          }
        }
      }

      // If we got here and didn't throw, the action succeeded
      // But also check if required outputs were extracted
      if (step.outputs && step.outputs.length > 0) {
        const missingOutputs = step.outputs.filter(
          (output) => !extractedVariables[output],
        );
        if (missingOutputs.length > 0) {
          onLog({
            timestamp: Date.now(),
            level: "warn",
            message: `Action succeeded but missing required outputs: ${missingOutputs.join(", ")} - continuing to fallback actions`,
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

    const status: StepStatus = {
      status: "running",
      logs: [],
      startedAt: Date.now(),
    };

    try {
      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Starting step: ${stepName}`,
      });

      // Check if step has required inputs
      if (step.inputs && step.inputs.length > 0) {
        const missingInputs = step.inputs.filter(
          (input) => !updatedVariables[input],
        );
        if (missingInputs.length > 0) {
          console.log(
            `[DEBUG] Missing inputs detected: ${missingInputs.join(", ")}`,
          );
          throw new Error(
            `Cannot execute "${step.name}". Missing required data: ${missingInputs.join(", ")}. Please complete the previous steps first.`,
          );
        }
      }

      // Run step actions (including fallbacks)
      const actionResult = await runStepActions(
        step,
        updatedVariables,
        tokens,
        onLog,
        false, // full execution mode
      );

      if (!actionResult.success) {
        console.log(
          `[DEBUG] Action result failed for ${stepName}, throwing error`,
        );
        throw new Error("Step actions failed");
      }

      // Update variables with extracted values
      Object.assign(updatedVariables, actionResult.extractedVariables);

      // Persist variables globally
      for (const [key, value] of Object.entries(
        actionResult.extractedVariables,
      )) {
        await updateGlobalVariable(key, value);
      }

      status.result = actionResult.data;

      console.log(
        `[DEBUG] Step actions succeeded for ${stepName}, marking as completed`,
      );
      status.status = "completed";
      status.completedAt = Date.now();
      status.logs = logs;

      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Step completed: ${stepName}`,
      });

      // Persist step completion globally
      await updateGlobalStepStatus(stepName, status);
    } catch (error: unknown) {
      console.log(
        `[DEBUG] CAUGHT ERROR in executeWorkflowStep for ${stepName}:`,
        error,
      );

      // Parse API error details
      let errorMessage =
        error instanceof Error ? error.message : "Unknown error";
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
      } catch (parseError) {
        throw parseError;
      }

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
