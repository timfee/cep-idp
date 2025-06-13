import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { listOUAutomation, postOU } from "../endpoints/admin";

const InputSchema = z.object({
  customerId: z.string(),
});

export const createAutomationOU: StepDefinition = {
  name: "Create Automation Organizational Unit",
  role: "dirOrgunitRW",
  inputs: ["customerId"],

  async handler(ctx) {
    const { customerId } = InputSchema.parse({
      customerId: ctx.vars.customerId,
    });

    try {
      const resp = await listOUAutomation(ctx.api, { customerId });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const exists = (resp.organizationUnits?.length ?? 0) > 0;
      if (exists) {
        return StepResultSchema.parse({ success: true, mode: "verified" });
      }

      await postOU(ctx.api, {
        customerId,
        body: {
          name: "Automation",
          parentOrgUnitPath: "/",
        },
      });
      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (error: any) {
      ctx.log("error", "Failed to create OU", error);
      return StepResultSchema.parse({
        success: false,
        mode: "skipped",
        error: String(error),
      });
    }
  },
};
