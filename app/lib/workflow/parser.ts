import { Workflow, WorkflowSchema } from "./types";

import workflow from "../../../workflow.json";

export function parseWorkflow(): Workflow {
  try {
    return WorkflowSchema.parse(workflow);
  } catch (error) {
    console.error("Failed to parse workflow:", error);
    throw new Error("Invalid workflow file");
  }
}

export function getStepDependencies(
  workflow: Workflow,
  stepName: string
): string[] {
  const step = workflow.steps.find((s) => s.name === stepName);
  return step?.depends_on || [];
}

export function canExecuteStep(
  workflow: Workflow,
  stepName: string,
  completedSteps: Set<string>
): boolean {
  const dependencies = getStepDependencies(workflow, stepName);
  return dependencies.every((dep) => completedSteps.has(dep));
}

export function getExecutableSteps(
  workflow: Workflow,
  completedSteps: Set<string>
): string[] {
  return workflow.steps
    .filter(
      (step) =>
        !completedSteps.has(step.name) &&
        canExecuteStep(workflow, step.name, completedSteps)
    )
    .map((step) => step.name);
}

export function getRequiredScopes(
  workflow: Workflow,
  stepName: string
): string[] {
  const step = workflow.steps.find((s) => s.name === stepName);
  if (!step?.role) return [];

  return workflow.roles[step.role] || [];
}
