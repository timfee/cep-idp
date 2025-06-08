import { promises as fs } from 'fs'
import stripJsonComments from 'strip-json-comments'
import { Workflow, workflowSchema, Step } from './types'

export async function loadWorkflow(path: string): Promise<Workflow> {
  const text = await fs.readFile(path, 'utf8')
  const json = JSON.parse(stripJsonComments(text))
  return workflowSchema.parse(json)
}

export function buildStepMap(workflow: Workflow): Map<string, Step> {
  const map = new Map<string, Step>()
  for (const step of workflow.steps) {
    map.set(step.name, step)
  }
  return map
}

export function determineOrder(workflow: Workflow): Step[] {
  const map = buildStepMap(workflow)
  const visited = new Set<string>()
  const order: Step[] = []

  function visit(name: string, stack: string[] = []) {
    if (visited.has(name)) return
    if (stack.includes(name)) {
      throw new Error(`Circular dependency: ${[...stack, name].join(' -> ')}`)
    }
    const step = map.get(name)
    if (!step) throw new Error(`Unknown step ${name}`)
    stack.push(name)
    for (const dep of step.depends_on ?? []) {
      visit(dep, stack)
    }
    stack.pop()
    visited.add(name)
    order.push(step)
  }

  for (const step of workflow.steps) {
    visit(step.name)
  }
  return order
}
