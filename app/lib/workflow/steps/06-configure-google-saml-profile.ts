import { z } from "zod";

import {
  createSamlProfile,
  getIdpCreds,
  listSamlProfiles
} from "../endpoints/ci";
import { StepDefinition, StepResultSchema } from "../types";
import { handleStepError } from "./utils";

const OutputSchema = z.object({
  samlProfileId: z.string(),
  entityId: z.string(),
  acsUrl: z.string()
});

export const configureGoogleSamlProfile: StepDefinition = {
  name: "Configure Google SAML Profile",
  role: "ciInboundSso",

  async handler(ctx) {
    try {
      // Check existing profiles
      const list = await listSamlProfiles(ctx.api, {});
      type SsoProfile = {
        name?: string;
        idpConfig?: { entityId?: string };
        spConfig?: { spEntityId?: string };
      };

      const profile = (list as { inboundSamlSsoProfiles?: SsoProfile[] })
        .inboundSamlSsoProfiles?.[0];
      if (profile) {
        const outputs = OutputSchema.parse({
          samlProfileId: profile.name,
          entityId: profile.idpConfig?.entityId ?? "",
          acsUrl: profile.spConfig?.spEntityId ?? ""
        });
        ctx.setVars(outputs);
        return StepResultSchema.parse({
          success: true,
          mode: "verified",
          outputs
        });
      }

      // Create new profile (simplified minimal body)
      const createResp = (await createSamlProfile(ctx.api, {
        body: { displayName: "Microsoft Entra SAML" }
      })) as { name?: string };

      const newProfileId = createResp.name ?? "";

      // Fetch creds & upload cert placeholder (skipped) – skeleton
      await getIdpCreds(ctx.api, { samlProfileId: newProfileId });
      // addIdpCert could be invoked here if needed

      const outputs = OutputSchema.parse({
        samlProfileId: newProfileId,
        entityId: "", // unknown in skeleton
        acsUrl: ""
      });
      ctx.setVars(outputs);

      return StepResultSchema.parse({
        success: true,
        mode: "executed",
        outputs
      });
    } catch (err: unknown) {
      return handleStepError(err, this.name, ctx);
    }
  }
};
