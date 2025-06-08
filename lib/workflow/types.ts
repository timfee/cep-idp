import { z } from 'zod'

export const connectionSchema = z.object({
  base: z.string(),
  auth: z.string(),
})
export type Connection = z.infer<typeof connectionSchema>

export const endpointSchema = z.object({
  conn: z.string(),
  method: z.string(),
  path: z.string(),
  qs: z.record(z.any()).optional(),
})
export type Endpoint = z.infer<typeof endpointSchema>

export const variableSchema = z.object({
  default: z.any().optional(),
  validator: z.string().optional(),
  generator: z.string().optional(),
})
export type VariableDef = z.infer<typeof variableSchema>

export const stepActionSchema = z.object({
  use: z.string(),
  payload: z.any().optional(),
  outputs: z.record(z.string()).optional(),
  longRunning: z.boolean().optional(),
})
export type StepAction = z.infer<typeof stepActionSchema>

export const stepSchema = z.object({
  name: z.string(),
  verify: z.array(stepActionSchema.extend({ checker: z.string().optional(), field: z.string().optional(), value: z.string().optional(), jsonPath: z.string().optional() })).optional(),
  execute: z.array(stepActionSchema).optional(),
  manual: z.boolean().optional(),
  role: z.string().optional(),
  depends_on: z.array(z.string()).optional(),
  apiStatus: z.string().optional(),
})
export type Step = z.infer<typeof stepSchema>

export const workflowSchema = z.object({
  connections: z.record(connectionSchema),
  roles: z.record(z.array(z.string())),
  endpoints: z.record(endpointSchema),
  checkers: z.record(z.string()),
  variables: z.record(variableSchema),
  steps: z.array(stepSchema),
})
export type Workflow = z.infer<typeof workflowSchema>
