import { apiClient } from "../api/client";
import { evaluateChecker } from "./checkers";
import {
  Checker,
  ExecuteAction,
  LogEntry,
  Step,
  StepStatus,
  Token,
  Workflow,
} from "./types";
import { extractValueFromPath, substituteObject } from "./variables";

export class StepExecutor {
  constructor(
    private workflow: Workflow,
    private variables: Record<string, string>,
    private onLog: (entry: LogEntry) => void,
    private onVariableUpdate: (name: string, value: string) => void
  ) {}

  private log(level: LogEntry["level"], message: string, data?: unknown) {
    this.onLog({
      timestamp: Date.now(),
      level,
      message,
      data,
    });
  }

  async executeStep(
    step: Step,
    tokens: { google?: Token; microsoft?: Token }
  ): Promise<StepStatus> {
    const status: StepStatus = {
      status: "running",
      logs: [],
      startedAt: Date.now(),
    };

    try {
      this.log("info", `Starting step: ${step.name}`);

      // Run verification checks
      if (step.verify && step.verify.length > 0) {
        this.log("info", "Running verification checks...");

        for (const check of step.verify) {
          const verified = await this.runVerification(check, tokens);
          if (verified) {
            this.log("info", `Verification passed: ${check.use}`);
            status.status = "completed";
            status.completedAt = Date.now();
            return status;
          }
        }

        this.log("info", "Verification failed, executing actions...");
      }

      // Execute actions
      if (step.execute && step.execute.length > 0) {
        for (const action of step.execute) {
          await this.executeAction(action, tokens);
        }
      }

      status.status = "completed";
      status.completedAt = Date.now();
      this.log("info", `Step completed: ${step.name}`);
    } catch (error: unknown) {
      status.status = "failed";
      status.error = error instanceof Error ? error.message : "Unknown error";
      status.completedAt = Date.now();
      this.log("error", `Step failed: ${status.error}`, error);
    }

    return status;
  }

  private async runVerification(
    check: Checker,
    tokens: { google?: Token; microsoft?: Token }
  ): Promise<boolean> {
    try {
      const endpoint = this.workflow.endpoints[check.use];
      if (!endpoint) {
        throw new Error(`Endpoint not found: ${check.use}`);
      }

      const response = await apiClient.request(
        endpoint,
        this.workflow.connections,
        this.variables,
        tokens,
        undefined,
        { throwOnMissingVars: false }
      );

      return evaluateChecker(check, response, this.variables);
    } catch {
      // Verification errors are expected (e.g., 404)
      return false;
    }
  }

  private async executeAction(
    action: ExecuteAction,
    tokens: { google?: Token; microsoft?: Token }
  ): Promise<void> {
    const endpoint = this.workflow.endpoints[action.use];
    if (!endpoint) {
      throw new Error(`Endpoint not found: ${action.use}`);
    }

    this.log("info", `Executing: ${action.use}`);

    // Substitute variables in payload
    const payload = action.payload
      ? substituteObject(action.payload, this.variables, { throwOnMissing: true })
      : undefined;

    const response = await apiClient.request(
      endpoint,
      this.workflow.connections,
      this.variables,
      tokens,
      payload,
      { throwOnMissingVars: true }
    );

    // Handle long-running operations
    if (action.longRunning) {
      this.log("info", "Waiting for long-running operation...");
      await this.waitForOperation();
    }

    // Extract outputs
    if (action.outputs) {
      for (const [varName, path] of Object.entries(action.outputs)) {
        let value: unknown;

        if (path.startsWith("{") && path.endsWith("}")) {
          // Direct variable reference
          value = this.variables[path.slice(1, -1)];
        } else {
          // Extract from response
          value = extractValueFromPath(response, path);
        }

        if (value != null) {
          this.log("info", `Setting variable: ${varName} = ${value}`);
          this.onVariableUpdate(varName, String(value));
        }
      }
    }
  }

  private async waitForOperation(): Promise<void> {
    // Implement polling logic for long-running operations
    // This is a simplified version - real implementation would vary by API
    const maxAttempts = 60;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      // Check operation status (implementation depends on the API)
      // For now, we'll assume it completes
      break;
    }
  }
}
