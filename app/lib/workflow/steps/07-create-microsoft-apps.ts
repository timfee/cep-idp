import { z } from "zod";

import {
  appByTemplateProv,
  appByTemplateSSO,
  instantiateProv,
  instantiateSSO
} from "../endpoints/graph";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({
  provisioningTemplateId: z.string(),
  ssoTemplateId: z.string()
});

const OutputSchema = z.object({
  provisioningServicePrincipalId: z.string().optional(),
  ssoServicePrincipalId: z.string().optional(),
  ssoAppId: z.string().optional()
});

export const createMicrosoftApps: StepDefinition = {
  name: "Create Microsoft Apps",
  role: "graphAppRW",
  inputs: ["provisioningTemplateId", "ssoTemplateId"],
  outputs: [
    "provisioningServicePrincipalId",
    "ssoServicePrincipalId",
    "ssoAppId"
  ],

  async handler(ctx) {
    const { provisioningTemplateId, ssoTemplateId } = InputSchema.parse({
      provisioningTemplateId: ctx.vars.provisioningTemplateId,
      ssoTemplateId: ctx.vars.ssoTemplateId
    });

    try {
      // Check if provisioning app exists already
      const provisioningApps = await appByTemplateProv(ctx.api, {
        provisioningTemplateId
      });

      const existingProvisioning = provisioningApps.value?.[0];
      let provisioningSpId = existingProvisioning?.servicePrincipalId;

      if (!provisioningSpId) {
        const inst = await instantiateProv(ctx.api, {
          provisioningTemplateId
        });
        provisioningSpId = inst.servicePrincipal?.id;
      }

      // Same for SSO
      const ssoApps = await appByTemplateSSO(ctx.api, { ssoTemplateId });
      const existingSso = ssoApps.value?.[0];
      let ssoSpId = existingSso?.servicePrincipalId;
      let ssoAppId = existingSso?.appId;

      if (!ssoSpId) {
        const inst = await instantiateSSO(ctx.api, { ssoTemplateId });
        ssoSpId = inst.servicePrincipal?.id;
        ssoAppId = inst.application?.appId;
      }

      const outputs = OutputSchema.parse({
        provisioningServicePrincipalId: provisioningSpId,
        ssoServicePrincipalId: ssoSpId,
        ssoAppId
      });
      ctx.setVars(outputs);

      return StepResultSchema.parse({ success: true, mode: "executed", outputs });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
