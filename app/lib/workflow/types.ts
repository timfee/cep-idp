import { z } from 'zod';

// Workflow schema definitions
export const VariableSchema = z.object({
  validator: z.string().optional(),
  generator: z.string().optional(),
  default: z.string().optional(),
});

export const CheckerSchema = z.object({
  use: z.string(),
  checker: z.string().optional(),
  field: z.string().optional(),
  value: z.string().optional(),
  jsonPath: z.string().optional(),
});

export const ExecuteActionSchema = z.object({
  use: z.string(),
  payload: z.record(z.any()).optional(),
  outputs: z.record(z.string()).optional(),
  longRunning: z.boolean().optional(),
});

export const StepSchema = z.object({
  name: z.string(),
  verify: z.array(CheckerSchema).optional(),
  execute: z.array(ExecuteActionSchema).optional(),
  role: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  manual: z.boolean().optional(),
  apiStatus: z.string().optional(),
});

export const EndpointSchema = z.object({
  conn: z.string(),
  method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']),
  path: z.string(),
  qs: z.record(z.string()).optional(),
});

export const ConnectionSchema = z.object({
  base: z.string(),
  auth: z.string(),
});

export type Endpoint = z.infer<typeof EndpointSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;

export const WorkflowSchema = z.object({
  connections: z.record(ConnectionSchema),
  roles: z.record(z.array(z.string())),
  endpoints: z.record(EndpointSchema),
  checkers: z.record(z.string()),
  variables: z.record(VariableSchema),
  steps: z.array(StepSchema),
});

// Runtime types
export type Workflow = z.infer<typeof WorkflowSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Variable = z.infer<typeof VariableSchema>;
export type ExecuteAction = z.infer<typeof ExecuteActionSchema>;
export type Checker = z.infer<typeof CheckerSchema>;

// Token types
export const TokenSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.number(),
  scope: z.array(z.string()),
});

export type Token = z.infer<typeof TokenSchema>;

// Workflow state
export interface WorkflowState {
  variables: Record<string, string>;
  stepStatus: Record<string, StepStatus>;
  tokens: {
    google?: Token;
    microsoft?: Token;
  };
}

export interface StepStatus {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  error?: string;
  result?: unknown;
  logs: LogEntry[];
  startedAt?: number;
  completedAt?: number;
}

export interface LogEntry {
  timestamp: number;
  level: 'info' | 'warn' | 'error';
  message: string;
  data?: unknown;
}

// OAuth Config
export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
}
