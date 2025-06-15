#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const wrapperCode = `
export function defineStepHandler<TInput extends Record<string, unknown>, TOutput extends Record<string, unknown>>(
  inputSchema: z.ZodType<TInput>,
  outputSchema: z.ZodType<TOutput>,
  handler: (ctx: StepContext, input: TInput) => Promise<StepResult>
): StepDefinition['handler'] {
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
      return handleStepError(err, ctx);
    }
  };
}`;

// Add to utils.ts
const utilsPath = path.join(__dirname, "../app/lib/workflow/steps/utils.ts");
const utilsContent = fs.readFileSync(utilsPath, "utf8");

// Check if already added
if (!utilsContent.includes("defineStepHandler")) {
  fs.writeFileSync(utilsPath, utilsContent + "\n" + wrapperCode);
  console.log("✓ Added step handler wrapper to utils.ts");
} else {
  console.log("✓ Step handler wrapper already exists");
}
