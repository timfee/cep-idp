import { z } from "zod";

import { STATUS_VALUES } from "./constants";

// OAuth Token

export const TokenSchema = z
  .object({
    accessToken: z.string().describe("Bearer token string"),
    refreshToken: z
      .string()
      .optional()
      .describe("Refresh token used to obtain a new access token"),
    expiresAt: z
      .number()
      .describe("Unix timestamp (ms) indicating when the token expires"),
    scope: z.array(z.string()).describe("OAuth scopes granted by the token")
  })
  .describe("Persisted OAuth token metadata");

export type Token = z.infer<typeof TokenSchema>;

// Runtime execution status & logging

export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

export interface StepStatus {
  status: (typeof STATUS_VALUES)[keyof typeof STATUS_VALUES];
  error?: string;
  result?: unknown;
  logs: LogEntry[];
  startedAt?: number;
  completedAt?: number;
  variables?: Record<string, string>;
}

// Step handler interfaces

export interface StepContext {
  /** Mutable map of workflow variables */
  vars: Record<string, string>;

  /**
   * Lightweight API wrapper that endpoint helpers rely on.  This re-uses the
   * ApiContext shape from the endpoint layer so the strongly-typed helpers in
   * app/lib/workflow/endpoints can be passed the `ctx.api` object without any
   * additional casting.
   */
  api: import("./endpoints/utils").ApiContext;

  /** Persist new / updated variables */
  setVars: (updates: Record<string, unknown>) => void;

  /** Structured logging */
  log: (level: string, message: string, data?: unknown) => void;
}

export interface StepResult {
  success: boolean;
  mode: "verified" | "executed" | "skipped" | "already-exists";
  error?: string;
  outputs?: Record<string, string>;
}

export interface StepDefinition {
  /** Human-readable name displayed in the UI */
  name: string;

  /** Optional permission role required to run the step */
  role?: string;

  /** Variable prerequisites */
  inputs?: string[];

  /** Variables produced when the step completes */
  outputs?: string[];

  /** Indicates that the step is performed manually */
  manual?: boolean;

  /** Optional free-form status string returned by the step handler */
  apiStatus?: string;

  /** Optional dependency list used by the UI for ordering/enablement */
  depends_on?: string[];

  /** Main business logic */
  handler: (ctx: StepContext) => Promise<StepResult>;
}

// Zod wrappers for runtime validation (used by workflow parser)
export const StepResultSchema = z.object({
  success: z.boolean(),
  mode: z.enum(["verified", "executed", "skipped", "already-exists"]),
  error: z.string().optional(),
  outputs: z.record(z.string()).optional()
});
