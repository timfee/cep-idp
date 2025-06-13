import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import {
  instantiateProv,
  instantiateSSO,
  appByTemplateProv,
  appByTemplateSSO,
} from "../endpoints/graph";

const InputSchema = z.object({
  provTemplateId: z.string(),
  ssoTemplateId: z.string(),
});

const OutputSchema = z.object({
  provServicePrincipalId: z.string().optional(),
  ssoServicePrincipalId: z.string().optional(),
  ssoAppId: z.string().optional(),
});

export const createMicrosoftApps: StepDefinition = {
  name: "Create Microsoft Apps",
  role: "graphAppRW",
  inputs: ["provTemplateId", "ssoTemplateId"],
  outputs: ["provServicePrincipalId", "ssoServicePrincipalId", "ssoAppId"],

  async handler(ctx) {
    const { provTemplateId, ssoTemplateId } = InputSchema.parse({
      provTemplateId: ctx.vars.provTemplateId,
      ssoTemplateId: ctx.vars.ssoTemplateId,
    });

    // Check if provisioning app exists already
    const provApps = await appByTemplateProv(ctx.api, { provTemplateId });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const existingProv = provApps.value?.[0];

    let provSpId = existingProv?.servicePrincipalId as string | undefined;

    if (!provSpId) {
      const inst = await instantiateProv(ctx.api, { provTemplateId });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      provSpId = inst.servicePrincipal.id;
    }

    // Same for SSO
    const ssoApps = await appByTemplateSSO(ctx.api, { ssoTemplateId });
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const existingSso = ssoApps.value?.[0];
    let ssoSpId = existingSso?.servicePrincipalId as string | undefined;
    let ssoAppId = existingSso?.appId as string | undefined;

    if (!ssoSpId) {
      const inst = await instantiateSSO(ctx.api, { ssoTemplateId });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ssoSpId = inst.servicePrincipal.id;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      ssoAppId = inst.application.appId;
    }

    const outputs = OutputSchema.parse({
      provServicePrincipalId: provSpId,
      ssoServicePrincipalId: ssoSpId,
      ssoAppId,
    });
    ctx.setVars(outputs);

    return StepResultSchema.parse({ success: true, mode: "executed", outputs });
  },
};
