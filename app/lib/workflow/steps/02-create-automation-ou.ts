import { z } from "zod";

import { listOUAutomation, postOU } from "../endpoints/admin";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({ customerId: z.string() });

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
      type OrgUnitsResponse = { organizationUnits?: unknown[] };

      const { organizationUnits } = resp as OrgUnitsResponse;
      const exists = (organizationUnits?.length ?? 0) > 0;
      if (exists) {
        return StepResultSchema.parse({ success: true, mode: "verified" });
      }

      await postOU(ctx.api, {
        customerId,
        body: { name: "Automation", parentOrgUnitPath: "/" },
      });
      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  },
};
