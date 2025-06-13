import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import {
  getSync,
  patchSync,
  startSyncJob,
  getSamlSettings,
  patchSamlSettings,
} from "../endpoints/graph";

const InputSchema = z.object({
  provServicePrincipalId: z.string(),
  jobId: z.string().default("Initial"),
  ssoServicePrincipalId: z.string(),
});

export const configureMicrosoftSyncSSO: StepDefinition = {
  name: "Configure Microsoft Sync and SSO",
  role: "graphSyncRW",
  inputs: [
    "provServicePrincipalId",
    "ssoServicePrincipalId",
  ],

  async handler(ctx) {
    const { provServicePrincipalId, jobId, ssoServicePrincipalId } =
      InputSchema.parse({
        provServicePrincipalId: ctx.vars.provServicePrincipalId,
        jobId: ctx.vars.jobId ?? "Initial",
        ssoServicePrincipalId: ctx.vars.ssoServicePrincipalId,
      });

    // Placeholder implementation that attempts to patch sync and saml settings
    try {
      await patchSync(ctx.api, {
        servicePrincipalId: provServicePrincipalId,
        body: { synchronizationTemplates: [] },
      });
      await startSyncJob(ctx.api, {
        servicePrincipalId: provServicePrincipalId,
        jobId,
      });

      // Patch SAML settings to include claims etc.
      const settings = await getSamlSettings(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId,
      });
      await patchSamlSettings(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId,
        body: settings, // no-op patch as placeholder
      });

      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (error: any) {
      ctx.log("error", "Failed to configure sync/SSO", error);
      return StepResultSchema.parse({ success: false, mode: "skipped", error: String(error) });
    }
  },
};
