import { z } from "zod";

/**
 * Zod schemas describing the shape of `workflow.json`.
 *
 * Each schema includes rich descriptions so developers can better understand
 * what each field represents when authoring a workflow.  The descriptions are
 * surfaced by IDE tooling and at runtime when validation fails.
 */

/**
 * Execution modes allowed for an action definition.
 *
 * - `verify`   - action checks for desired state but makes no changes
 * - `execute`  - action attempts to enforce the desired state
 */
export const ACTION_MODES = { VERIFY: "verify", EXECUTE: "execute" } as const;
export type ActionMode = (typeof ACTION_MODES)[keyof typeof ACTION_MODES];

export const ActionModeEnum = z
  .enum([ACTION_MODES.VERIFY, ACTION_MODES.EXECUTE])
  .describe("How the action should behave during step execution");

/**
 * Definition of a variable referenced throughout the workflow.
 *
 * Variables may be provided by the environment, extracted from API responses
 * or generated on the fly.  Optional fields control validation and defaulting
 * behaviour.
 */
export const VariableSchema = z
  .object({
    validator: z
      .string()
      .optional()
      .describe("Regular expression that the variable value must match"),
    generator: z
      .string()
      .optional()
      .describe(
        "Name of a generator function used when the variable has no value"
      ),
    default: z
      .string()
      .optional()
      .describe("Default value used if the workflow does not supply one"),
  })
  .describe("Metadata describing a workflow variable");

/**
 * Single unit of work executed as part of a step.
 */
export const ActionSchema = z
  .object({
    use: z.string().describe("Identifier of the endpoint to invoke"),
    checker: z
      .string()
      .optional()
      .describe(
        "Name of a checker expression used to validate the response"
      ),
    field: z
      .string()
      .optional()
      .describe("Field placeholder passed to the checker expression"),
    value: z
      .string()
      .optional()
      .describe("Value placeholder passed to the checker expression"),
    jsonPath: z
      .string()
      .optional()
      .describe("JsonPath used when evaluating the checker"),
    payload: z
      .record(z.unknown())
      .optional()
      .describe(
        "Request body template. Values may reference workflow variables"
      ),
    extract: z
      .record(z.string())
      .optional()
      .describe(
        "Map of variables to extract from the response using JsonPath"
      ),
    longRunning: z
      .boolean()
      .optional()
      .describe(
        "Indicates the action triggers an asynchronous operation that may take time"
      ),
    fallback: z
      .boolean()
      .optional()
      .describe(
        "If true, run this action only when preceding verification fails"
      ),
    mode: z
      .array(ActionModeEnum)
      .optional()
      .describe(
        "Explicit execution mode. Defaults to both verify and execute"
      ),
  })
  .describe("Definition of a workflow action");

/** Schema describing a workflow step. */
export const StepSchema = z
  .object({
    name: z.string().describe("Descriptive name shown in the UI"),
    inputs: z
      .array(z.string())
      .optional()
      .describe(
        "Variables that must be populated before this step can run"
      ),
    outputs: z
      .array(z.string())
      .optional()
      .describe("Variables produced by successful execution"),
    actions: z
      .array(ActionSchema)
      .optional()
      .describe(
        "List of actions executed sequentially when verify/execute is unspecified"
      ),
    verify: z
      .array(ActionSchema)
      .optional()
      .describe("Actions that confirm the desired state already exists"),
    execute: z
      .array(ActionSchema)
      .optional()
      .describe(
        "Actions that enforce the desired state when verification fails"
      ),
    role: z
      .string()
      .optional()
      .describe(
        "Permission role required for the authenticated user to run this step"
      ),
    depends_on: z
      .array(z.string())
      .optional()
      .describe("Other steps that must complete before this one"),
    manual: z
      .boolean()
      .optional()
      .describe(
        "If true, the user confirms completion manually outside the automation"
      ),
    apiStatus: z
      .string()
      .optional()
      .describe(
        "Optional hint string displayed while an API call is in progress"
      ),
  })
  .superRefine((val, ctx) => {
    const hasActions = (val.actions?.length ?? 0) > 0;
    const hasVerify = (val.verify?.length ?? 0) > 0;
    const hasExecute = (val.execute?.length ?? 0) > 0;
    if (!val.manual && !hasActions && !hasVerify && !hasExecute) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Step must define actions via 'actions' or 'verify'/'execute'",
      });
    }
    if (hasActions && (hasVerify || hasExecute)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Step cannot mix 'actions' with 'verify'/'execute'",
      });
    }
  })
  .describe("Ordered task executed by the workflow engine");

/**
 * Reusable API request definition referenced by actions.
 */
export const EndpointSchema = z
  .object({
    conn: z.string().describe("Name of the connection configuration to use"),
    method: z
      .enum(["GET", "POST", "PATCH", "PUT", "DELETE"])
      .describe("HTTP verb used when calling the endpoint"),
    path: z
      .string()
      .describe("Path template relative to the connection base URL"),
    qs: z
      .record(z.string())
      .optional()
      .describe(
        "Optional map of query string parameters with template support"
      ),
  })
  .describe("Endpoint configuration for making API calls");

/**
 * Definition of a remote API host and how to authenticate to it.
 */
export const ConnectionSchema = z
  .object({
    base: z.string().describe("Base URL of the API host"),
    auth: z
      .string()
      .describe(
        "Authorization header template, e.g. 'Bearer {accessToken}'"
      ),
  })
  .describe("Connection information used when performing requests");

/** Top-level workflow configuration schema. */
export const WorkflowSchema = z
  .object({
    connections: z
      .record(ConnectionSchema)
      .describe("All remote systems the workflow may communicate with"),
    roles: z
      .record(z.array(z.string()))
      .describe(
        "Mapping of role names to OAuth scopes required for certain steps"
      ),
    endpoints: z
      .record(EndpointSchema)
      .describe("Reusable endpoint templates referenced by actions"),
    checkers: z
      .record(z.string())
      .describe(
        "Expressions used to evaluate API responses inside actions"
      ),
    variables: z
      .record(VariableSchema)
      .describe("All variables referenced throughout the workflow"),
    steps: z
      .array(StepSchema)
      .describe("Ordered list of tasks executed by the workflow engine"),
  })
  .describe("Root object describing the entire workflow");

/**
 * Shape of an OAuth token stored for reuse between API calls.
 */
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
    scope: z
      .array(z.string())
      .describe("OAuth scopes granted by the token"),
  })
  .describe("Persisted OAuth token metadata");

export type Workflow = z.infer<typeof WorkflowSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Endpoint = z.infer<typeof EndpointSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Token = z.infer<typeof TokenSchema>;

/** Lifecycle states for an executing step. */
export const STEP_STATUS = {
  PENDING: "pending",
  RUNNING: "running",
  COMPLETED: "completed",
  FAILED: "failed",
  SKIPPED: "skipped",
} as const;
export type StepStatusValue = (typeof STEP_STATUS)[keyof typeof STEP_STATUS];

/** Holds persisted workflow state between page requests. */
export interface WorkflowState {
  variables: Record<string, string>;
  stepStatus: Record<string, StepStatus>;
}

/** Runtime information about a single step execution. */
export interface StepStatus {
  status: StepStatusValue;
  error?: string;
  result?: unknown;
  logs: LogEntry[];
  startedAt?: number;
  completedAt?: number;
  variables?: Record<string, string>;
}

/** Single log line emitted during step execution. */
export interface LogEntry {
  timestamp: number;
  level: "info" | "warn" | "error";
  message: string;
  data?: unknown;
}

/** OAuth metadata required to start and maintain a token. */
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}
