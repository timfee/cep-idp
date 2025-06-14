import { StepResultSchema } from "../types";

/**
 * Shared error handler for workflow steps.
 *
 * Logs the error and returns a standardized StepResult object indicating the
 * failure so that individual step implementations don't have to duplicate
 * this boilerplate.
 */
export function handleStepError(
  error: unknown,
  stepName: string,
  ctx: { log: (level: string, message: string, data?: unknown) => void }
) {
  const message = error instanceof Error ? error.message : String(error);
  ctx.log("error", `Failed in ${stepName}`, error);
  return StepResultSchema.parse({
    success: false,
    mode: "skipped",
    error: message,
  });
}
