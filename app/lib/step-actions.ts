"use server";

import { 
  Step, 
  LogEntry, 
  Token, 
  parseWorkflow, 
  extractValueFromPath,
  substituteVariables,
  substituteObject,
  evaluateChecker,
  extractMissingVariables 
} from "./workflow";
import { apiClient } from "./api-client";

/**
 * Run actions for a step (shared implementation)
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

      // Merge any previously extracted variables into current variables before payload substitution
      for (const [key, value] of Object.entries(extractedVariables)) {
        variables[key] = value;
      }

      console.log(`[DEBUG] Variables available for ${action.use}:`, Object.keys(variables));

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
        // Add debug logging for Custom admin role step
        if (step.name === "Custom admin role") {
          onLog({
            timestamp: Date.now(),
            level: "info",
            message: `[DEBUG] Custom admin role response from ${action.use}:`,
            data: response
          });
          
          // Log the response structure
          if (response && typeof response === 'object') {
            const responseObj = response as Record<string, unknown>;
            onLog({
              timestamp: Date.now(),
              level: "info",
              message: `[DEBUG] Response keys: ${Object.keys(responseObj).join(', ')}`,
            });
            
            if ('items' in responseObj && Array.isArray(responseObj.items)) {
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
                  if (item && typeof item === 'object') {
                    const itemObj = item as Record<string, unknown>;
                    onLog({
                      timestamp: Date.now(),
                      level: "info",
                      message: `[DEBUG] Privilege ${index}: serviceName="${itemObj.serviceName}", serviceId="${itemObj.serviceId}", privilegeName="${itemObj.privilegeName}"`,
                    });
                  }
                });
                
                // Check if Admin Directory API service exists
                const adminDirService = responseObj.items.find((item: any) => 
                  item?.serviceName === 'Admin Directory API'
                );
                
                if (adminDirService) {
                  onLog({
                    timestamp: Date.now(),
                    level: "info",
                    message: `[DEBUG] FOUND Admin Directory API service:`,
                    data: adminDirService
                  });
                } else {
                  onLog({
                    timestamp: Date.now(),
                    level: "warn",
                    message: `[DEBUG] Admin Directory API service NOT FOUND in privileges list!`,
                  });
                  
                  // Log all available service names
                  const serviceNames = responseObj.items
                    .map((item: any) => item?.serviceName)
                    .filter(Boolean);
                  onLog({
                    timestamp: Date.now(),
                    level: "info",
                    message: `[DEBUG] Available service names: ${serviceNames.join(', ')}`,
                  });
                }
              } else if (action.use === "admin.listRoles") {
                responseObj.items.forEach((item: unknown, index: number) => {
                  if (item && typeof item === 'object') {
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
            if (path.includes('$.items[?(@.roleName==')) {
              onLog({
                timestamp: Date.now(),
                level: "info",
                message: `[DEBUG] This is a JSONPath filter query, checking for specific role name`,
              });
              
              if (response && typeof response === 'object' && 'items' in response) {
                const items = (response as any).items;
                if (Array.isArray(items)) {
                  const roleNames = items.map((item: any) => item.roleName || 'undefined').join(', ');
                  onLog({
                    timestamp: Date.now(),
                    level: "info",
                    message: `[DEBUG] Available role names: [${roleNames}]`,
                  });
                  
                  // Check if the specific role exists
                  const targetRole = items.find((item: any) => item.roleName === 'Microsoft Entra Provisioning');
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