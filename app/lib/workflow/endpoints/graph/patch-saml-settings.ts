import { z } from "zod";
import { API_PATHS } from "../../constants";
import { PatchSamlSettingsBodySchema } from "../../schemas/requests";
import { GraphNoContentResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: PatchSamlSettingsBodySchema,
});

export type PatchSamlSettingsParams = z.infer<typeof ParamsSchema>;
export type PatchSamlSettingsResponse = z.infer<
  typeof GraphNoContentResponseSchema
>;

export const patchSamlSettings = createEndpoint({
  connection: "graphBeta",
  method: "PATCH",
  pathTemplate: API_PATHS.SAML_SP_SETTINGS,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => params.body,
});
