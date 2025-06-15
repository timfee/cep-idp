import { z } from "zod";

import { createPolicy, linkPolicy, listPolicies } from "../endpoints/graph";
import { MS_GRAPH_CONFIG } from "../constants";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const InputSchema = z.object({ ssoServicePrincipalId: z.string() });

const OutputSchema = z.object({ claimsPolicyId: z.string() });

export const setupClaimsPolicy: StepDefinition = {
  name: "Setup Microsoft Claims Policy",
  role: "graphPolicyRW",
  inputs: ["ssoServicePrincipalId"],
  outputs: ["claimsPolicyId"],

  async handler(ctx) {
    const { ssoServicePrincipalId } = InputSchema.parse({
      ssoServicePrincipalId: ctx.vars.ssoServicePrincipalId
    });

    try {
      // Check existing policies
      const policies = await listPolicies(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId
      });

      const existing = policies.value?.[0];
      if (existing && existing.id) {
        const outputs = OutputSchema.parse({ claimsPolicyId: existing.id });
        ctx.setVars(outputs);
        return StepResultSchema.parse({
          success: true,
          mode: "verified",
          outputs
        });
      }

      // Create minimal policy
      const policyDefinition = {
        ClaimsMappingPolicy: {
          Version: MS_GRAPH_CONFIG.CLAIMS_POLICY_VERSION,
          IncludeBasicClaimSet: true,
          ClaimsSchema: []
        }
      };

      const newPolicy = await createPolicy(ctx.api, {
        body: {
          definition: [JSON.stringify(policyDefinition)],
          displayName: MS_GRAPH_CONFIG.CLAIMS_POLICY_NAME,
          isOrganizationDefault: false
        }
      });

      await linkPolicy(ctx.api, {
        servicePrincipalId: ssoServicePrincipalId,
        body: {
          "@odata.id": `${MS_GRAPH_CONFIG.GRAPH_BETA_BASE}/policies/claimsMappingPolicies/${newPolicy.id}`
        }
      });

      const outputs = OutputSchema.parse({ claimsPolicyId: newPolicy.id });
      ctx.setVars(outputs);

      return StepResultSchema.parse({ success: true, mode: "executed", outputs });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
