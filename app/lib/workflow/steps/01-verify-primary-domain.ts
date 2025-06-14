import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { listDomains, postDomain } from "../endpoints/admin";
import { ERROR_MESSAGES } from "../constants";

const InputSchema = z.object({
  customerId: z.string(),
});

// Removed OutputSchema – no runtime usage

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
      type DomainItem = {
        domainName?: string;
        isPrimary?: boolean;
        verified?: boolean;
      };

      const primary = (domainsResp as { domains?: DomainItem[] }).domains?.find(
        (d) => d.isPrimary === true
      );
      if (!primary) {
        throw new Error("Primary domain not found");
      }

      const primaryDomain = primary.domainName as string;
      ctx.setVars({ primaryDomain });

      // Check verification status
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.log("error", ERROR_MESSAGES.RESOURCE_NOT_FOUND(this.name), err);
      return StepResultSchema.parse({
        success: false,
        mode: "skipped",
        error: message,
      });
    }
  },
};
