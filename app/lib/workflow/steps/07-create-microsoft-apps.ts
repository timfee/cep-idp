import { z } from "zod";

import {
  appByTemplateProv,
  appByTemplateSSO,
  instantiateProv,
  instantiateSSO,
} from "../endpoints/graph";
import { StepDefinition, StepResultSchema } from "../types";

const InputSchema = z.object({
  provisioningTemplateId: z.string(),
  ssoTemplateId: z.string(),
});

const OutputSchema = z.object({
  provisioningServicePrincipalId: z.string().optional(),
  ssoServicePrincipalId: z.string().optional(),
  ssoAppId: z.string().optional(),
});

export const createMicrosoftApps: StepDefinition = {
  name: "Create Microsoft Apps",
  role: "graphAppRW",
  inputs: ["provisioningTemplateId", "ssoTemplateId"],
  outputs: [
    "provisioningServicePrincipalId",
    "ssoServicePrincipalId",
    "ssoAppId",
  ],

  async handler(ctx) {
    const { provisioningTemplateId, ssoTemplateId } = InputSchema.parse({
      provisioningTemplateId: ctx.vars.provisioningTemplateId,
      ssoTemplateId: ctx.vars.ssoTemplateId,
    });

    // Check if provisioning app exists already
    const provisioningApps = (await appByTemplateProv(ctx.api, {
      provisioningTemplateId,
    })) as { value?: { servicePrincipalId?: string }[] };

    const existingProvisioning = provisioningApps.value?.[0];

    let provisioningSpId = existingProvisioning?.servicePrincipalId as
      | string
      | undefined;

    if (!provisioningSpId) {
      const inst = (await instantiateProv(ctx.api, {
        provisioningTemplateId,
      })) as { servicePrincipal?: { id?: string } };

      provisioningSpId = inst.servicePrincipal?.id;
    }

    // Same for SSO
    const ssoApps = (await appByTemplateSSO(ctx.api, { ssoTemplateId })) as {
      value?: { servicePrincipalId?: string; appId?: string }[];
    };

    const existingSso = ssoApps.value?.[0];
    let ssoSpId = existingSso?.servicePrincipalId as string | undefined;
    let ssoAppId = existingSso?.appId as string | undefined;

    if (!ssoSpId) {
      const inst = (await instantiateSSO(ctx.api, { ssoTemplateId })) as {
        servicePrincipal?: { id?: string };
        application?: { appId?: string };
      };

      ssoSpId = inst.servicePrincipal?.id;
      ssoAppId = inst.application?.appId;
    }

    const outputs = OutputSchema.parse({
      provisioningServicePrincipalId: provisioningSpId,
      ssoServicePrincipalId: ssoSpId,
      ssoAppId,
    });
    ctx.setVars(outputs);

    return StepResultSchema.parse({ success: true, mode: "executed", outputs });
  },
};
