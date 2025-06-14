import { z } from "zod";

import { listSsoAssignments, postSsoAssignment } from "../endpoints/ci";
import { StepDefinition, StepResultSchema } from "../types";

const InputSchema = z.object({ samlProfileId: z.string() });

export const assignUsersToSSO: StepDefinition = {
  name: "Assign Users to SSO App",
  role: "ciInboundSso",
  inputs: ["samlProfileId"],

  async handler(ctx) {
    const { samlProfileId } = InputSchema.parse({
      samlProfileId: ctx.vars.samlProfileId,
    });

    const assignments = (await listSsoAssignments(ctx.api, {})) as {
      inboundSsoAssignments?: {
        targetGroup?: { id?: string };
        samlSsoInfo?: { inboundSamlSsoProfile?: string };
      }[];
    };

    const exists = assignments.inboundSsoAssignments?.some(
      (a) =>
        a.targetGroup?.id === "allUsers"
        && a.samlSsoInfo?.inboundSamlSsoProfile === samlProfileId
    );

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
