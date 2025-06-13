import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { getDomain, listDomains, postDomain } from "../endpoints/admin";
import { ERROR_MESSAGES } from "../constants";

const InputSchema = z.object({
  customerId: z.string(),
});

const OutputSchema = z.object({
  primaryDomain: z.string(),
});

export const verifyPrimaryDomain: StepDefinition = {
  name: "Verify Primary Domain",
  role: "dirDomainRW",
  outputs: ["primaryDomain"],

  async handler(ctx) {
    const { customerId } = InputSchema.parse({
      customerId: ctx.vars.customerId,
    });

    try {
      const domainsResp = await listDomains(ctx.api, { customerId });
      // naive extraction; assumes domainsResp has domains array
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const primary = domainsResp.domains?.find((d: any) => d.isPrimary);
      if (!primary) {
        throw new Error("Primary domain not found");
      }

      const primaryDomain = primary.domainName as string;
      ctx.setVars({ primaryDomain });

      // Check verification status
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (primary.verified) {
        return StepResultSchema.parse({
          success: true,
          mode: "verified",
          outputs: { primaryDomain },
        });
      }

      // Attempt to (re-)create domain – will 409 if exists and not verified
      await postDomain(ctx.api, {
        customerId,
        body: { domainName: primaryDomain },
      });

      return StepResultSchema.parse({
        success: true,
        mode: "executed",
        outputs: { primaryDomain },
      });
    } catch (error: any) {
      ctx.log("error", ERROR_MESSAGES.RESOURCE_NOT_FOUND(this.name), error);
      return StepResultSchema.parse({
        success: false,
        mode: "skipped",
        error: String(error),
      });
    }
  },
};
