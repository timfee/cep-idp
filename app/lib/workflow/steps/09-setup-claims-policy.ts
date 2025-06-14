import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import { listPolicies, createPolicy, linkPolicy } from "../endpoints/graph";

const InputSchema = z.object({
  ssoServicePrincipalId: z.string(),
});

const OutputSchema = z.object({
  claimsPolicyId: z.string(),
});

export const setupClaimsPolicy: StepDefinition = {
  name: "Setup Microsoft Claims Policy",
  role: "graphPolicyRW",
  inputs: ["ssoServicePrincipalId"],
  outputs: ["claimsPolicyId"],

  async handler(ctx) {
    const { ssoServicePrincipalId } = InputSchema.parse({
      ssoServicePrincipalId: ctx.vars.ssoServicePrincipalId,
    });

    // Check existing policies
    const policies = (await listPolicies(ctx.api, {
      servicePrincipalId: ssoServicePrincipalId,
    })) as { value?: { id?: string }[] };

    const existing = policies.value?.[0];
    if (existing) {
      const outputs = OutputSchema.parse({ claimsPolicyId: existing.id });
      ctx.setVars(outputs);
      return StepResultSchema.parse({ success: true, mode: "verified", outputs });
    }

    // Create minimal policy
    const newPolicy = (await createPolicy(ctx.api, {
      body: { definition: [], displayName: "Google Claims", isOrganizationDefault: false },
    })) as { id?: string };

    const policyId = newPolicy.id ?? "";

    await linkPolicy(ctx.api, {
      servicePrincipalId: ssoServicePrincipalId,
      body: { '@odata.id': `https://graph.microsoft.com/beta/policies/claimsMappingPolicies/${policyId}` },
    });

    const outputs = OutputSchema.parse({ claimsPolicyId: policyId });
    ctx.setVars(outputs);

    return StepResultSchema.parse({ success: true, mode: "executed", outputs });
  },
};
