import { z } from "zod";

import { API_PATHS } from "../../constants";
import { SamlSettingsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ servicePrincipalId: z.string() });

export type GetSamlSettingsParams = z.infer<typeof ParamsSchema>;
export type GetSamlSettingsResponse = z.infer<typeof SamlSettingsResponseSchema>;

export const getSamlSettings = createEndpoint({
  connection: "graphBeta",
  method: "GET",
  pathTemplate: API_PATHS.SAML_SP_SETTINGS,
  paramsSchema: ParamsSchema,
  responseSchema: SamlSettingsResponseSchema
});
