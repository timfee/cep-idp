import { z } from "zod";

import { listSsoAssignments, postSsoAssignment } from "../endpoints/ci";
import { GOOGLE_GROUPS, SAML_CONFIG } from "../constants";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({ samlProfileId: z.string() });

export const assignUsersToSSO: StepDefinition = {
  name: "Assign Users to SSO App",
  role: "ciInboundSso",
  inputs: ["samlProfileId"],

  async handler(ctx) {
    const { samlProfileId } = InputSchema.parse({
      samlProfileId: ctx.vars.samlProfileId
    });

    try {
      const assignments = await listSsoAssignments(ctx.api, {});
      const exists = assignments.inboundSsoAssignments?.some(
        a => a.targetGroup?.id === GOOGLE_GROUPS.ALL_USERS &&
             a.samlSsoInfo?.inboundSamlSsoProfile === samlProfileId
      );

      if (exists) {
        return StepResultSchema.parse({ success: true, mode: "verified" });
      }

      await postSsoAssignment(ctx.api, {
        body: {
          targetGroup: { id: GOOGLE_GROUPS.ALL_USERS },
          samlSsoInfo: { 
            inboundSamlSsoProfile: samlProfileId 
          },
          ssoMode: SAML_CONFIG.SSO_MODE_SAML
        }
      });

      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
