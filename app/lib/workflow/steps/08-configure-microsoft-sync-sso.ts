import { z } from "zod";

import {
  getSamlSettings,
  patchSamlSettings,
  patchSync,
  startSyncJob
} from "../endpoints/graph";
import { MS_GRAPH_CONFIG, SYNC_CONFIG } from "../constants";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({
  provisioningServicePrincipalId: z.string(),
  jobId: z.string().default(SYNC_CONFIG.DEFAULT_JOB_ID),
  ssoServicePrincipalId: z.string(),
  generatedPassword: z.string()
});

export const configureMicrosoftSyncSSO: StepDefinition = {
  name: "Configure Microsoft Sync and SSO",
  role: "graphSyncRW",
  inputs: ["provisioningServicePrincipalId", "ssoServicePrincipalId", "generatedPassword"],

  async handler(ctx) {
    const { 
      provisioningServicePrincipalId, 
      jobId, 
      ssoServicePrincipalId,
      generatedPassword 
    } = InputSchema.parse({
      provisioningServicePrincipalId: ctx.vars.provisioningServicePrincipalId,
      jobId: ctx.vars.jobId ?? SYNC_CONFIG.DEFAULT_JOB_ID,
      ssoServicePrincipalId: ctx.vars.ssoServicePrincipalId,
      generatedPassword: ctx.vars.generatedPassword
    });

    try {
      // Configure sync with Google credentials
      await patchSync(ctx.api, {
        servicePrincipalId: provisioningServicePrincipalId,
        body: { 
          secrets: [
            {
              key: MS_GRAPH_CONFIG.BASE_ADDRESS_KEY,
              value: MS_GRAPH_CONFIG.GOOGLE_ADMIN_BASE
            },
            {
              key: MS_GRAPH_CONFIG.SECRET_KEY_KEY,
              value: generatedPassword
            }
          ]
        }
      });
      
      // Start sync job
      await startSyncJob(ctx.api, {
        servicePrincipalId: provisioningServicePrincipalId,
        jobId
      });

      // Configure SAML settings
      const settings = await getSamlSettings(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId
      });
      
      await patchSamlSettings(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId,
        body: settings
      });

      return StepResultSchema.parse({ success: true, mode: "executed" });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
