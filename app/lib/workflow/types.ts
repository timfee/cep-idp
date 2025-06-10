import { z } from "zod";

/** Execution modes allowed for an action definition. */
export const ACTION_MODES = { VERIFY: "verify", EXECUTE: "execute" } as const;
export type ActionMode = (typeof ACTION_MODES)[keyof typeof ACTION_MODES];

export const ActionModeEnum = z.enum([
  ACTION_MODES.VERIFY,
  ACTION_MODES.EXECUTE,
]);

/** Schema describing a workflow variable. */
export const VariableSchema = z.object({
  validator: z.string().optional(),
  generator: z.string().optional(),
  default: z.string().optional(),
});

/** Schema describing a single workflow action. */
export const ActionSchema = z.object({
  use: z.string(),
  checker: z.string().optional(),
  field: z.string().optional(),
  value: z.string().optional(),
  jsonPath: z.string().optional(),
  payload: z.record(z.unknown()).optional(),
  extract: z.record(z.string()).optional(),
  longRunning: z.boolean().optional(),
  fallback: z.boolean().optional(),
  mode: z.array(ActionModeEnum).optional(),
  interactive: z
    .object({
      type: z.enum(["select", "create", "select-or-create"]),
      variable: z.string(),
      prompt: z.string(),
      extractOptions: z.string().optional(),
      default: z.string().optional(),
      createOption: z
        .union([
          z.boolean(),
          z.object({
            prompt: z.string(),
            fields: z.array(
              z.object({
                name: z.string(),
                type: z.enum(["text", "password", "email"]).optional(),
                validator: z.string().optional(),
                generator: z.string().optional(),
                default: z.string().optional(),
                label: z.string().optional(),
              })
            ),
            transform: z.string().optional(),
          }),
        ])
        .optional(),
      requiresPassword: z.boolean().optional(),
    })
    .optional(),
  condition: z.string().optional(),
});

/** Schema describing a workflow step. */
export const StepSchema = z.object({
  name: z.string(),
  inputs: z.array(z.string()).optional(),
  outputs: z.array(z.string()).optional(),
  actions: z.array(ActionSchema).optional(),
  verify: z.array(ActionSchema).optional(),
  execute: z.array(ActionSchema).optional(),
  role: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  manual: z.boolean().optional(),
  apiStatus: z.string().optional(),
});

/** Schema for an API endpoint declaration. */
export const EndpointSchema = z.object({
  conn: z.string(),
  method: z.enum(["GET", "POST", "PATCH", "PUT", "DELETE"]),
  path: z.string(),
  qs: z.record(z.string()).optional(),
});

/** Schema for a remote connection configuration. */
export const ConnectionSchema = z.object({
  base: z.string(),
  auth: z.string(),
});

/** Top-level workflow configuration schema. */
export const WorkflowSchema = z.object({
  connections: z.record(ConnectionSchema),
  roles: z.record(z.array(z.string())),
  endpoints: z.record(EndpointSchema),
  checkers: z.record(z.string()),
  variables: z.record(VariableSchema),
  steps: z.array(StepSchema),
});

/** OAuth token persisted for API calls. */
export const TokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.array(z.string()),
});

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
  needsInteraction?: boolean;
  actionIndex?: number;
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

export interface InteractiveRequest {
  stepName: string;
  actionIndex: number;
  config: {
    type: "select" | "create" | "select-or-create";
    variable: string;
    prompt: string;
    extractOptions?: string;
    default?: string;
    createOption?:
      | boolean
      | {
          prompt: string;
          fields: Array<{
            name: string;
            type?: "text" | "password" | "email";
            validator?: string;
            generator?: string;
            default?: string;
            label?: string;
          }>;
          transform?: string;
        };
    requiresPassword?: boolean;
  };
  options?: Array<{ name: string; value: string }>;
}

export interface InteractiveResponse {
  value: string;
  metadata?: Record<string, string>;
}
