import { z } from "zod";

import {
  createSamlProfile,
  getIdpCreds,
  listSamlProfiles
} from "../endpoints/ci";
import { SAML_CONFIG } from "../constants";
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
  outputs: ["samlProfileId", "entityId", "acsUrl"],

  async handler(ctx) {
    try {
      // Check existing profiles
      const list = await listSamlProfiles(ctx.api, {});
      const existingProfile = list.inboundSamlSsoProfiles?.[0];
      
      if (existingProfile && existingProfile.name) {
        const outputs = OutputSchema.parse({
          samlProfileId: existingProfile.name,
          entityId: existingProfile.spConfig?.entityId ?? existingProfile.spConfig?.spEntityId ?? "",
          acsUrl: existingProfile.spConfig?.assertionConsumerServiceUri ?? ""
        });
        ctx.setVars(outputs);
        return StepResultSchema.parse({
          success: true,
          mode: "verified",
          outputs
        });
      }

      // Create new profile
      const createResp = await createSamlProfile(ctx.api, {
        body: { 
          displayName: SAML_CONFIG.DISPLAY_NAME,
          idpConfig: {
            entityId: "",  // Will be set later
            singleSignOnServiceUri: ""  // Will be set later
          }
        }
      });

      if (!createResp.done || !createResp.response) {
        throw new Error("Failed to create SAML profile");
      }

      const profileResponse = createResp.response as { name?: string; spConfig?: { entityId?: string; assertionConsumerServiceUri?: string } };
      const newProfileId = profileResponse.name ?? "";
      const profileParts = newProfileId.split('/');
      const profileIdOnly = profileParts[profileParts.length - 1];

      // Fetch credentials (for future cert upload)
      await getIdpCreds(ctx.api, { samlProfileId: profileIdOnly });

      const outputs = OutputSchema.parse({
        samlProfileId: newProfileId,
        entityId: profileResponse.spConfig?.entityId ?? "",
        acsUrl: profileResponse.spConfig?.assertionConsumerServiceUri ?? ""
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
