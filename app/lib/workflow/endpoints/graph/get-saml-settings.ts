import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
});

const ResponseSchema = z.unknown();

export type GetSamlSettingsParams = z.infer<typeof ParamsSchema>;
export type GetSamlSettingsResponse = z.infer<typeof ResponseSchema>;

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
    responseSchema: ResponseSchema,
  });
}
