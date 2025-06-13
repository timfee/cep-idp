import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { getUser, postUser } from "../endpoints/admin";
import { generatePassword } from "../generators";

const InputSchema = z.object({
  primaryDomain: z.string(),
});

const OutputSchema = z.object({
  provisioningUserId: z.string(),
  provisioningUserEmail: z.string(),
});

export const createServiceAccount: StepDefinition = {
  name: "Create Service Account for Microsoft",
  role: "dirUserRW",
  inputs: ["primaryDomain"],
  outputs: ["provisioningUserId", "provisioningUserEmail"],

  async handler(ctx) {
    const { primaryDomain } = InputSchema.parse({
      primaryDomain: ctx.vars.primaryDomain,
    });

    const targetEmail = `azuread-provisioning@${primaryDomain}`;

    // Try fetch existing user
    try {
      const user = await getUser(ctx.api, { userEmail: targetEmail });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const outputs = OutputSchema.parse({
        provisioningUserId: user.id,
        provisioningUserEmail: user.primaryEmail,
      });
      ctx.setVars(outputs);
      return StepResultSchema.parse({ success: true, mode: "verified", outputs });
    } catch {
      // proceed to create
    }

    const password = generatePassword(16);
    const createResp = await postUser(ctx.api, {
      body: {
        primaryEmail: targetEmail,
        name: { givenName: "Microsoft", familyName: "Provisioning" },
        password,
        orgUnitPath: "/Automation",
      },
    });

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const outputs = OutputSchema.parse({
      provisioningUserId: createResp.id,
      provisioningUserEmail: createResp.primaryEmail,
    });
    ctx.setVars({ ...outputs, generatedPassword: password });

    return StepResultSchema.parse({ success: true, mode: "executed", outputs });
  },
};
