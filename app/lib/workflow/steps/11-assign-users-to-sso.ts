import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { listSsoAssignments, postSsoAssignment } from "../endpoints/ci";

const InputSchema = z.object({
  samlProfileId: z.string(),
});

export const assignUsersToSSO: StepDefinition = {
  name: "Assign Users to SSO App",
  role: "ciInboundSso",
  inputs: ["samlProfileId"],

  async handler(ctx) {
    const { samlProfileId } = InputSchema.parse({ samlProfileId: ctx.vars.samlProfileId });

    const assignments = await listSsoAssignments(ctx.api, {});
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const exists = assignments.inboundSsoAssignments?.some((a: any) => a.targetGroup?.id === "allUsers" && a.samlSsoInfo?.inboundSamlSsoProfile == samlProfileId);

    if (exists) {
      return StepResultSchema.parse({ success: true, mode: "verified" });
    }

    await postSsoAssignment(ctx.api, {
      body: {
        targetGroup: { id: "allUsers" },
        samlSsoInfo: { inboundSamlSsoProfile: samlProfileId },
      },
    });

    return StepResultSchema.parse({ success: true, mode: "executed" });
  },
};
