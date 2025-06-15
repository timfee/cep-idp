import { z } from "zod";

import { API_PATHS } from "../../constants";
import { SamlSettingsResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ servicePrincipalId: z.string() });

const ResponseSchema = SamlSettingsResponseSchema;

export type GetSamlSettingsParams = z.infer<typeof ParamsSchema>;
export type GetSamlSettingsResponse = z.infer<typeof SamlSettingsResponseSchema>;

export async function getSamlSettings(
  ctx: ApiContext,
  params: GetSamlSettingsParams
): Promise<GetSamlSettingsResponse> {
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "GET",
    pathTemplate: API_PATHS.SAML_SP_SETTINGS,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: SamlSettingsResponseSchema
  });
}
