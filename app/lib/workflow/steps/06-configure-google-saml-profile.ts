import { z } from "zod";

import { StepDefinition, StepResultSchema } from "../types";
import {
  listSamlProfiles,
  createSamlProfile,
  getIdpCreds,
  addIdpCert,
} from "../endpoints/ci";

const InputSchema = z.object({
  customerId: z.string().optional(), // not needed for CI endpoints
});

const OutputSchema = z.object({
  samlProfileId: z.string(),
  entityId: z.string(),
  acsUrl: z.string(),
});

export const configureGoogleSamlProfile: StepDefinition = {
  name: "Configure Google SAML Profile",
  role: "ciInboundSso",

  async handler(ctx) {
    try {
      // Check existing profiles
      const list = await listSamlProfiles(ctx.api, {});
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const profile = list.inboundSamlSsoProfiles?.[0];
      if (profile) {
        const outputs = OutputSchema.parse({
          samlProfileId: profile.name,
          entityId: profile.idpConfig?.entityId ?? "",
          acsUrl: profile.spConfig?.spEntityId ?? "",
        });
        ctx.setVars(outputs);
        return StepResultSchema.parse({ success: true, mode: "verified", outputs });
      }

      // Create new profile (simplified minimal body)
      const createResp = await createSamlProfile(ctx.api, {
        body: { displayName: "Microsoft Entra SAML" },
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const newProfileId = createResp.name;

      // Fetch creds & upload cert placeholder (skipped) – skeleton
      await getIdpCreds(ctx.api, { samlProfileId: newProfileId });
      // addIdpCert could be invoked here if needed

      const outputs = OutputSchema.parse({
        samlProfileId: newProfileId,
        entityId: "", // unknown in skeleton
        acsUrl: "",
      });
      ctx.setVars(outputs);

      return StepResultSchema.parse({ success: true, mode: "executed", outputs });
    } catch (error: any) {
      ctx.log("error", "Failed to configure SAML profile", error);
      return StepResultSchema.parse({ success: false, mode: "skipped", error: String(error) });
    }
  },
};
