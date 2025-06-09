"use server";

import { revalidatePath } from "next/cache";
import { unstable_cache as cache } from "next/cache";
import { getToken } from "@/app/lib/auth/tokens";
import { parseWorkflow } from "@/app/lib/workflow/parser";
import {
  evaluateGenerator,
  extractValueFromPath,
  substituteVariables,
  substituteObject,
} from "@/app/lib/workflow/variables";
import { evaluateChecker } from "@/app/lib/workflow/checkers";
import { apiClient } from "@/app/lib/api/client";
import {
  Workflow,
  WorkflowState,
  StepStatus,
  Token,
  Step,
  Checker,
  LogEntry,
  Variable,
  ExecuteAction,
} from "@/app/lib/workflow/types";
import { validateVariable } from "@/app/lib/workflow/variables";

export interface AuthState {
  google: {
    authenticated: boolean;
    scopes: string[];
  };
  microsoft: {
    authenticated: boolean;
    scopes: string[];
  };
}

export interface WorkflowData {
  workflow: Workflow;
  variables: Record<string, string>;
  stepStatuses: Record<string, StepStatus>;
  auth: AuthState;
}

interface VerificationResult {
  verified: boolean;
  data?: any;
  extractedVariables?: Record<string, string>;
}

/**
 * Run verification checks for a step
 */
async function runStepVerification(
  step: Step,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
): Promise<VerificationResult> {
  if (!step.verify || step.verify.length === 0) {
    return { verified: false };
  }

  const workflow = parseWorkflow();

  // Try each verification check
  for (const check of step.verify) {
    try {
      const endpoint = workflow.endpoints[check.use];
      if (!endpoint) {
        console.error(`Endpoint not found: ${check.use}`);
        continue;
      }

      // Skip verification if required variables are missing
      const checkEndpoint = workflow.endpoints[check.use];
      if (checkEndpoint?.path) {
        const missingVars = extractMissingVariables(checkEndpoint.path, variables);
        if (missingVars.length > 0) {
          console.log(
            `Skipping verification ${check.use} - missing variables: ${missingVars.join(', ')}`
          );
          continue;
        }
      }

      const response = await apiClient.request(
        endpoint,
        workflow.connections,
        variables,
        tokens,
        undefined, // body
        { throwOnMissingVars: false }, // Don't throw during verification
      );

      // If response is null (404), verification fails
      if (response === null) {
        continue;
      }

      const verified = evaluateChecker(check, response, variables);

      if (verified) {
        // Extract variables from response if this step has execute actions with outputs
        const extractedVariables: Record<string, string> = {};

        // Find the corresponding execute action to get output mappings
        if (step.execute) {
          for (const action of step.execute) {
            if (action.outputs) {
              for (const [varName, path] of Object.entries(action.outputs)) {
                if (path.startsWith("{") && path.endsWith("}")) {
                  // Direct variable reference
                  const varRef = path.slice(1, -1);
                  if (variables[varRef]) {
                    extractedVariables[varName] = variables[varRef];
                  }
                } else {
                  // Extract from response using enhanced path parsing
                  const value = extractValueFromPath(response, path);
                  if (value != null) {
                    extractedVariables[varName] = String(value);
                  }
                }
              }
            }
          }
        }

        return {
          verified: true,
          data: response,
          extractedVariables:
            Object.keys(extractedVariables).length > 0
              ? extractedVariables
              : undefined,
        };
      }
    } catch (error: any) {
      // Handle different error types
      if (error.message?.includes("401")) {
        // Authentication error - this is a real problem
        console.error(`Authentication failed for ${check.use}:`, error);
        throw new Error(`Authentication failed: ${error.message}`);
      } else if (error.message?.includes("404")) {
        // Resource not found - this is expected for verification
        console.log(`Resource not found for ${check.use} - this is expected`);
        return { verified: false };
      } else {
        // Other errors
        console.log(`Verification check ${check.use} failed:`, error);
      }
    }
  }

  return { verified: false };
}

/**
 * Extract missing variables from a template string
 */
function extractMissingVariables(
  template: string,
  variables: Record<string, string>
): string[] {
  const missing: string[] = [];
  
  // Find all variable references in the template
  const matches = template.matchAll(/\{([^}]+)\}/g);
  
  for (const match of matches) {
    const expression = match[1];
    
    // Handle template functions - extract variable names from them
    if (expression.includes('(')) {
      const functionVars = extractVariablesFromExpression(expression);
      for (const varName of functionVars) {
        if (!(varName in variables) && !missing.includes(varName)) {
          missing.push(varName);
        }
      }
    } else {
      // Simple variable reference
      if (!(expression in variables) && !missing.includes(expression)) {
        missing.push(expression);
      }
    }
  }
  
  return missing;
}

/**
 * Extract variable names from template expressions
 */
function extractVariablesFromExpression(expression: string): string[] {
  const variables: string[] = [];
  
  // Parse function call to extract variable arguments
  const match = expression.match(/^(\w+)\((.*)\)$/);
  if (match) {
    const [, , argsString] = match;
    
    if (argsString.trim()) {
      // Simple parsing - split by comma and check for unquoted arguments
      const args = argsString.split(',').map(arg => arg.trim());
      
      for (const arg of args) {
        // Skip quoted strings, keep variable names
        if (!arg.startsWith('"') && !arg.startsWith("'") && 
            !arg.includes('(') && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(arg)) {
          variables.push(arg);
        }
      }
    }
  }
  
  return variables;
}

/**
 * Execute a single action and return extracted variables
 */
async function executeAction(
  action: ExecuteAction,
  workflow: Workflow,
  variables: Record<string, string>,
  tokens: { google?: Token; microsoft?: Token },
  onLog: (entry: LogEntry) => void,
): Promise<Record<string, string>> {
  const endpoint = workflow.endpoints[action.use];
  if (!endpoint) {
    throw new Error(`Endpoint not found: ${action.use}`);
  }

  onLog({
    timestamp: Date.now(),
    level: "info",
    message: `Executing: ${action.use}`,
  });

  // Substitute variables in payload
  const payload = action.payload
    ? substituteObject(action.payload, variables, { throwOnMissing: true })
    : undefined;

  const response = await apiClient.request(
    endpoint,
    workflow.connections,
    variables,
    tokens,
    payload,
    { throwOnMissingVars: true },
  );

  // Handle long-running operations
  if (action.longRunning) {
    onLog({
      timestamp: Date.now(),
      level: "info",
      message: "Waiting for long-running operation...",
    });
    // For now, just wait a bit - real implementation would poll
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Extract outputs
  const extractedVariables: Record<string, string> = {};
  if (action.outputs) {
    for (const [varName, path] of Object.entries(action.outputs)) {
      let value: unknown;

      if (path.startsWith("{") && path.endsWith("}")) {
        // Direct variable reference
        value = variables[path.slice(1, -1)];
      } else {
        // Extract from response using enhanced path parsing
        value = extractValueFromPath(response, path);
      }

      if (value != null) {
        const stringValue = String(value);
        extractedVariables[varName] = stringValue;
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: `Setting variable: ${varName} = ${stringValue}`,
        });
      }
    }
  }

  return extractedVariables;
}

/**
 * Get complete workflow data by reconstructing state from verification checks
 */
export async function getWorkflowData(
  forceRefresh = false,
): Promise<WorkflowData> {
  // Get auth status
  const googleToken = await getToken("google");
  const microsoftToken = await getToken("microsoft");

  const tokens = {
    google: googleToken ?? undefined,
    microsoft: microsoftToken ?? undefined,
  };

  // Get workflow definition
  const workflow = parseWorkflow();

  // Initialize variables with defaults
  const variables: Record<string, string> = {};
  for (const [name, varDef] of Object.entries(workflow.variables)) {
    if (varDef.default) {
      variables[name] = varDef.default;
    } else if (varDef.generator) {
      variables[name] = evaluateGenerator(varDef.generator);
    }
  }

  // Process steps in dependency order
  const stepStatuses: Record<string, StepStatus> = {};
  const processedSteps = new Set<string>();

  // Helper to check if all dependencies are met
  const areDependenciesMet = (step: Step): boolean => {
    if (!step.depends_on) return true;
    return step.depends_on.every((dep) => {
      const depStatus = stepStatuses[dep];
      return (
        depStatus &&
        (depStatus.status === "completed" || depStatus.status === "skipped")
      );
    });
  };

  // Helper to check if auth requirements are met
  const isAuthMet = (step: Step): boolean => {
    if (!step.role) return true;

    const requiredScopes = workflow.roles[step.role] || [];
    const isGoogleStep =
      step.role.startsWith("dir") || step.role.startsWith("ci");
    const isMicrosoftStep = step.role.startsWith("graph");

    if (isGoogleStep && googleToken) {
      return requiredScopes.every((scope) => googleToken.scope.includes(scope));
    } else if (isMicrosoftStep && microsoftToken) {
      return requiredScopes.every((scope) =>
        microsoftToken.scope.includes(scope),
      );
    }

    return false;
  };

  // Process steps until all are processed
  let iteration = 0;
  while (
    processedSteps.size < workflow.steps.length &&
    iteration < workflow.steps.length
  ) {
    iteration++;

    for (const step of workflow.steps) {
      if (processedSteps.has(step.name)) continue;

      // Skip if dependencies not met
      if (!areDependenciesMet(step)) {
        continue;
      }

      // Check auth requirements
      if (!isAuthMet(step)) {
        stepStatuses[step.name] = { status: "pending", logs: [] };
        processedSteps.add(step.name);
        continue;
      }

      // Skip manual steps
      if (step.manual) {
        stepStatuses[step.name] = { status: "pending", logs: [] };
        processedSteps.add(step.name);
        continue;
      }

      // Run verification with caching
      const cacheKey = `step-verify-${step.name}`;
      const cacheTime = forceRefresh ? 0 : 300; // 5 minutes default

      const cachedVerification = cache(
        async () => runStepVerification(step, variables, tokens),
        [cacheKey],
        { revalidate: cacheTime },
      );

      const verifyResult = await cachedVerification();

      if (verifyResult.verified) {
        stepStatuses[step.name] = {
          status: "completed",
          logs: [],
          result: verifyResult.data,
          completedAt: Date.now(),
        };

        // Merge extracted variables
        if (verifyResult.extractedVariables) {
          Object.assign(variables, verifyResult.extractedVariables);
        }
      } else {
        stepStatuses[step.name] = { status: "pending", logs: [] };
      }

      processedSteps.add(step.name);
    }
  }

  // Mark any unprocessed steps as pending (shouldn't happen with correct dependencies)
  for (const step of workflow.steps) {
    if (!stepStatuses[step.name]) {
      stepStatuses[step.name] = { status: "pending", logs: [] };
    }
  }

  return {
    workflow,
    variables,
    stepStatuses,
    auth: {
      google: {
        authenticated: !!googleToken,
        scopes: googleToken?.scope || [],
      },
      microsoft: {
        authenticated: !!microsoftToken,
        scopes: microsoftToken?.scope || [],
      },
    },
  };
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
    // Get current state
    const { workflow, variables } = await getWorkflowData();

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
    const updatedVariables = { ...variables };

    const onLog = (log: LogEntry) => logs.push(log);

    const status: StepStatus = {
      status: "running",
      logs: [],
      startedAt: Date.now(),
    };

    try {
      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Starting step: ${step.name}`,
      });

      // Run verification checks first
      if (step.verify && step.verify.length > 0) {
        onLog({
          timestamp: Date.now(),
          level: "info",
          message: "Running verification checks...",
        });

        const verifyResult = await runStepVerification(step, updatedVariables, tokens);
        
        if (verifyResult.verified) {
          onLog({
            timestamp: Date.now(),
            level: "info",
            message: "Verification passed - step already completed",
          });
          
          // Merge any extracted variables from verification
          if (verifyResult.extractedVariables) {
            Object.assign(updatedVariables, verifyResult.extractedVariables);
          }
          
          status.status = "completed";
          status.completedAt = Date.now();
          status.logs = logs;
          status.result = verifyResult.data;

          return {
            success: true,
            status,
            variables: updatedVariables,
          };
        }

        onLog({
          timestamp: Date.now(),
          level: "info",
          message: "Verification failed, executing actions...",
        });
      }

      // Execute actions
      if (step.execute && step.execute.length > 0) {
        for (const action of step.execute) {
          const extractedVars = await executeAction(
            action,
            workflow,
            updatedVariables,
            tokens,
            onLog,
          );
          
          // Update variables with extracted values
          Object.assign(updatedVariables, extractedVars);
        }
      }

      status.status = "completed";
      status.completedAt = Date.now();
      status.logs = logs;

      onLog({
        timestamp: Date.now(),
        level: "info",
        message: `Step completed: ${step.name}`,
      });
    } catch (error: unknown) {
      status.status = "failed";
      status.error = error instanceof Error ? error.message : "Unknown error";
      status.completedAt = Date.now();
      status.logs = logs;
      
      onLog({
        timestamp: Date.now(),
        level: "error",
        message: `Step failed: ${status.error}`,
        data: error,
      });
    }

    // Invalidate cache for this step and all dependent steps
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
export async function refreshWorkflowState(): Promise<void> {
  // Force refresh by bypassing cache
  await getWorkflowData(true);
  revalidatePath("/");
}

/**
 * Get authentication status
 */
export async function getAuthStatus(): Promise<AuthState> {
  const googleToken = await getToken("google");
  const microsoftToken = await getToken("microsoft");

  return {
    google: {
      authenticated: !!googleToken,
      scopes: googleToken?.scope || [],
    },
    microsoft: {
      authenticated: !!microsoftToken,
      scopes: microsoftToken?.scope || [],
    },
  };
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

    // Variable is valid, but we don't persist it anymore
    // It will be used in the next workflow execution
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

/**
 * Get available variables and their definitions
 */
export async function getWorkflowVariables(): Promise<{
  variables: Record<
    string,
    {
      value?: string;
      definition: Variable;
      isRequired: boolean;
    }
  >;
}> {
  const workflow = parseWorkflow();
  const { variables } = await getWorkflowData();

  const result: Record<
    string,
    {
      value?: string;
      definition: Variable;
      isRequired: boolean;
    }
  > = {};

  // Check which variables are required by steps
  const requiredVars = new Set<string>();
  for (const step of workflow.steps) {
    if (step.execute) {
      for (const action of step.execute) {
        if (action.payload) {
          const payloadStr = JSON.stringify(action.payload);
          const matches = payloadStr.matchAll(/\{([^}]+)\}/g);
          for (const match of matches) {
            requiredVars.add(match[1]);
          }
        }
      }
    }
  }

  // Build result with current values and definitions
  for (const [name, def] of Object.entries(workflow.variables)) {
    result[name] = {
      value: variables[name],
      definition: def,
      isRequired: requiredVars.has(name),
    };
  }

  return { variables: result };
}