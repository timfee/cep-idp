import z from "zod";
import {
  StepContext,
  StepDefinition,
  StepResult,
  StepResultSchema
} from "../types";

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
  ctx: StepContext
): StepResult {
  const message = error instanceof Error ? error.message : String(error);
  ctx.log("error", `Failed in ${stepName}`, error);
  console.error(`Error in ${stepName}`, error, ctx);
  return StepResultSchema.parse({
    success: false,
    mode: "skipped",
    error: message
  });
}
export function defineStepHandler<
  TInput extends Record<string, unknown>,
  TOutput extends Record<string, unknown>
>(
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
  handler: (ctx: StepContext, input: TInput) => Promise<StepResult>
): StepDefinition["handler"] {
  return async (ctx) => {
    try {
      const input = inputSchema.parse(ctx.vars);
      const result = await handler(ctx, input);
      if (result.outputs) {
        const validated = outputSchema.parse(result.outputs);
        ctx.setVars(validated);
      }
      return result;
    } catch (err) {
      return handleStepError(err, "Step", ctx);
    }
  };
}
