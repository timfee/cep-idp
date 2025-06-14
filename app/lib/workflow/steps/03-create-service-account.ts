import { z } from "zod";

import { getUser, postUser } from "../endpoints/admin";
import { generatePassword } from "../generators";
import { StepDefinition, StepResultSchema } from "../types";

const InputSchema = z.object({ primaryDomain: z.string() });

const OutputSchema = z.object({
  provisioningUserId: z.string(),
  provisioningUserEmail: z.string()
});

export const createServiceAccount: StepDefinition = {
  name: "Create Service Account for Microsoft",
  role: "dirUserRW",
  inputs: ["primaryDomain"],
  outputs: ["provisioningUserId", "provisioningUserEmail"],

  async handler(ctx) {
    const { primaryDomain } = InputSchema.parse({
      primaryDomain: ctx.vars.primaryDomain
    });

    const targetEmail = `azuread-provisioning@${primaryDomain}`;

    // Try fetch existing user
    try {
      const user = (await getUser(ctx.api, {
        userEmail: targetEmail
      })) as Record<string, unknown>;
      const outputs = OutputSchema.parse({
        provisioningUserId: String(user.id),
        provisioningUserEmail: String(user.primaryEmail)
      });
      ctx.setVars(outputs);
      return StepResultSchema.parse({
        success: true,
        mode: "verified",
        outputs
      });
    } catch {
      // proceed to create
    }

    const PASSWORD_LENGTH = 16;
    const password = generatePassword(PASSWORD_LENGTH);
    const createResp = (await postUser(ctx.api, {
      body: {
        primaryEmail: targetEmail,
        name: { givenName: "Microsoft", familyName: "Provisioning" },
        password,
        orgUnitPath: "/Automation"
      }
    })) as Record<string, unknown>;

    const outputs = OutputSchema.parse({
      provisioningUserId: String(createResp.id),
      provisioningUserEmail: String(createResp.primaryEmail)
    });
    ctx.setVars({ ...outputs, generatedPassword: password });

    return StepResultSchema.parse({ success: true, mode: "executed", outputs });
  }
};
