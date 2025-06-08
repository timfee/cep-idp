import { ApiClient } from '../api/client'
import { Step, Workflow, Endpoint } from './types'
import { substitute, Variables } from './variables'

export interface ExecutionContext {
  workflow: Workflow
  variables: Variables
  clients: Record<string, ApiClient>
}

interface StepAction {
  use: string
  payload?: Record<string, unknown>
}

async function callEndpoint(ctx: ExecutionContext, action: StepAction): Promise<unknown> {
  const ep = ctx.workflow.endpoints[action.use] as Endpoint
  if (!ep) throw new Error(`Unknown endpoint ${action.use}`)
  const client = ctx.clients[ep.conn]
  if (!client) throw new Error(`Unknown connection ${ep.conn}`)
  const path = substitute(ep.path, ctx.variables)
  const init: RequestInit = { method: ep.method }
  if (action.payload) {
    init.body = JSON.stringify(substitute(action.payload, ctx.variables))
    init.headers = { 'Content-Type': 'application/json' }
  }
  let urlPath = path
  if (ep.qs) {
    const qsObj = substitute(ep.qs, ctx.variables) as Record<string, string>
    const params = new URLSearchParams(qsObj)
    urlPath += `?${params.toString()}`
  }
  return client.request(urlPath, init)
}

function applyOutputs(outputs: Record<string, string>, data: unknown, vars: Variables) {
  const obj = data as Record<string, unknown>
  for (const [key, expr] of Object.entries(outputs)) {
    if (expr.startsWith('$.')) {
      const path = expr.slice(2)
      vars[key] = path.split('.').reduce((v: unknown, p) => {
        if (v == null || typeof v !== 'object') return undefined
        return (v as Record<string, unknown>)[p]
      }, obj as unknown)
    } else {
      vars[key] = substitute(expr, vars)
    }
  }
}

export async function executeStep(ctx: ExecutionContext, step: Step): Promise<void> {
  for (const action of step.execute ?? []) {
    const res = await callEndpoint(ctx, action)
    if (action.outputs) {
      applyOutputs(action.outputs, res, ctx.variables)
    }
  }
}
