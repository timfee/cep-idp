import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";

const InputSchema = z.object({
  samlProfileId: z.string().optional(),
  entityId: z.string().optional(),
  acsUrl: z.string().optional()
});

export const completeGoogleSsoSetup: StepDefinition = {
  name: "Complete Google SSO Setup",
  inputs: ["samlProfileId"],

  async handler(ctx) {
    InputSchema.parse({
      samlProfileId: ctx.vars.samlProfileId,
      entityId: ctx.vars.entityId,
      acsUrl: ctx.vars.acsUrl
    });

    // Placeholder – in full implementation we would update Google configs.
    return StepResultSchema.parse({ success: true, mode: "skipped" });
  }
};
