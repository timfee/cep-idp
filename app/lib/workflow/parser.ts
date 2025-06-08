import { readFileSync } from 'fs';
import { join } from 'path';
import { Workflow, WorkflowSchema } from './types';

// Remove comments from JSONC
function stripJsonComments(jsonc: string): string {
  return jsonc
    .split('\n')
    .map(line => {
      const commentIndex = line.indexOf('//');
      if (commentIndex === -1) return line;

      // Check if // is inside a string
      let inString = false;
      let escapeNext = false;

      for (let i = 0; i < commentIndex; i++) {
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        if (line[i] === '\\') {
          escapeNext = true;
          continue;
        }
        if (line[i] === '"') {
          inString = !inString;
        }
      }

      return inString ? line : line.substring(0, commentIndex);
    })
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments
}

export function parseWorkflow(): Workflow {
  const workflowPath = join(process.cwd(), 'workflow.jsonc');
  const content = readFileSync(workflowPath, 'utf-8');
  const jsonContent = stripJsonComments(content);

  try {
    const parsed = JSON.parse(jsonContent);
    return WorkflowSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse workflow:', error);
    throw new Error('Invalid workflow file');
  }
}

export function getStepDependencies(workflow: Workflow, stepName: string): string[] {
  const step = workflow.steps.find(s => s.name === stepName);
  return step?.depends_on || [];
}

export function canExecuteStep(
  workflow: Workflow,
  stepName: string,
  completedSteps: Set<string>
): boolean {
  const dependencies = getStepDependencies(workflow, stepName);
  return dependencies.every(dep => completedSteps.has(dep));
}

export function getExecutableSteps(
  workflow: Workflow,
  completedSteps: Set<string>
): string[] {
  return workflow.steps
    .filter(step =>
      !completedSteps.has(step.name) &&
      canExecuteStep(workflow, step.name, completedSteps)
    )
    .map(step => step.name);
}

export function getRequiredScopes(workflow: Workflow, stepName: string): string[] {
  const step = workflow.steps.find(s => s.name === stepName);
  if (!step?.role) return [];

  return workflow.roles[step.role] || [];
}
