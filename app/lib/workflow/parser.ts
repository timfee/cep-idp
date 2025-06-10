import workflow from "@/workflow.json";
import { Action, ACTION_MODES, Workflow, WorkflowSchema } from "./types";

export function parseWorkflow(): Workflow {
  try {
    const parsed = WorkflowSchema.parse(workflow);

    parsed.steps = parsed.steps.map((step) => {
      const actions: Action[] = [];

      if (step.actions) {
        actions.push(
          ...step.actions.map((a) => ({
            ...a,
            mode: a.mode ?? [ACTION_MODES.VERIFY, ACTION_MODES.EXECUTE],
          }))
        );
      }

      if (step.verify) {
        actions.push(
          ...step.verify.map((a) => ({ ...a, mode: [ACTION_MODES.VERIFY] }))
        );
      }

      if (step.execute) {
        actions.push(
          ...step.execute.map((a) => ({ ...a, mode: [ACTION_MODES.EXECUTE] }))
        );
      }

      return { ...step, actions, verify: undefined, execute: undefined };
    });

    return parsed;
  } catch (error) {
    console.error("Failed to parse workflow:", error);
    throw new Error("Invalid workflow configuration");
  }
}
