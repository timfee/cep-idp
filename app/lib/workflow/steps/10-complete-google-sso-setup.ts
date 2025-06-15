import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";

const InputSchema = z.object({
  samlProfileId: z.string(),
  entityId: z.string().optional(),
  acsUrl: z.string().optional()
});

export const completeGoogleSsoSetup: StepDefinition = {
  name: "Complete Google SSO Setup",
  manual: true,
  inputs: ["samlProfileId", "entityId", "acsUrl"],

  async handler(ctx) {
    InputSchema.parse({
      samlProfileId: ctx.vars.samlProfileId,
      entityId: ctx.vars.entityId,
      acsUrl: ctx.vars.acsUrl
    });

    // Manual step - user must configure in Google Admin Console
    return StepResultSchema.parse({ success: true, mode: "skipped" });
  }
};
