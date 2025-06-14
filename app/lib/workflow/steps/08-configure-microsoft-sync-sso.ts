import { z } from "zod";

import {
  getSamlSettings,
  patchSamlSettings,
  patchSync,
  startSyncJob,
} from "../endpoints/graph";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({
  provisioningServicePrincipalId: z.string(),
  jobId: z.string().default("Initial"),
  ssoServicePrincipalId: z.string(),
});

export const configureMicrosoftSyncSSO: StepDefinition = {
  name: "Configure Microsoft Sync and SSO",
  role: "graphSyncRW",
  inputs: ["provisioningServicePrincipalId", "ssoServicePrincipalId"],

  async handler(ctx) {
    const { provisioningServicePrincipalId, jobId, ssoServicePrincipalId } =
      InputSchema.parse({
        provisioningServicePrincipalId: ctx.vars.provisioningServicePrincipalId,
        jobId: ctx.vars.jobId ?? "Initial",
        ssoServicePrincipalId: ctx.vars.ssoServicePrincipalId,
      });

    // Placeholder implementation that attempts to patch sync and saml settings
    try {
      await patchSync(ctx.api, {
        servicePrincipalId: provisioningServicePrincipalId,
        body: { synchronizationTemplates: [] },
      });
      await startSyncJob(ctx.api, {
        servicePrincipalId: provisioningServicePrincipalId,
        jobId,
      });

      // Patch SAML settings to include claims etc.
      const settings = (await getSamlSettings(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId,
      })) as Record<string, unknown>;
      await patchSamlSettings(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId,
        body: settings, // no-op patch as placeholder
      });

      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  },
};
