import { z } from "zod";

import { getUser, postUser } from "../endpoints/admin";
import { generatePassword } from "../generators";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({ primaryDomain: z.string() });

const OutputSchema = z.object({
  provisioningUserId: z.string(),
  provisioningUserEmail: z.string()
});

const PASSWORD_LENGTH = 16;

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
      const user = await getUser(ctx.api, { userEmail: targetEmail });
      
      const outputs = OutputSchema.parse({
        provisioningUserId: user.id,
        provisioningUserEmail: user.primaryEmail
      });
      
      ctx.setVars(outputs);
      
      return StepResultSchema.parse({
        success: true,
        mode: "verified",
        outputs
      });
    } catch {
      // User doesn't exist, proceed to create
    }

    try {
      const password = generatePassword(PASSWORD_LENGTH);
      const createResp = await postUser(ctx.api, {
        body: {
          primaryEmail: targetEmail,
          name: { givenName: "Microsoft", familyName: "Provisioning" },
          password,
          orgUnitPath: "/Automation"
        }
      });

      const outputs = OutputSchema.parse({
        provisioningUserId: createResp.id,
        provisioningUserEmail: createResp.primaryEmail
      });
      
      ctx.setVars({ ...outputs, generatedPassword: password });

      return StepResultSchema.parse({ 
        success: true, 
        mode: "executed", 
        outputs 
      });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
