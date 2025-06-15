import { z } from "zod";

import { listDomains, postDomain } from "../endpoints/admin";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({ customerId: z.string() });

export const verifyPrimaryDomain: StepDefinition = {
  name: "Verify Primary Domain",
  role: "dirDomainRW",
  outputs: ["primaryDomain"],

  async handler(ctx) {
    const { customerId } = InputSchema.parse({
      customerId: ctx.vars.customerId
    });

    try {
      const domainsResp = await listDomains(ctx.api, { customerId });
      
      const primary = domainsResp.domains?.find(d => d.isPrimary === true);
      if (!primary || !primary.domainName) {
        throw new Error("Primary domain not found");
      }

      const primaryDomain = primary.domainName;
      ctx.setVars({ primaryDomain });

      // Check verification status
      if (primary.verified) {
        return StepResultSchema.parse({
          success: true,
          mode: "verified",
          outputs: { primaryDomain }
        });
      }

      // Attempt to (re-)create domain – will 409 if exists and not verified
      await postDomain(ctx.api, {
        customerId,
        body: { domainName: primaryDomain }
      });

      return StepResultSchema.parse({
        success: true,
        mode: "executed",
        outputs: { primaryDomain }
      });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
