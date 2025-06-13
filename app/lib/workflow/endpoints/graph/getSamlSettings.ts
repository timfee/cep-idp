import { z } from "zod";

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
    pathTemplate:
      "/servicePrincipals/{servicePrincipalId}/samlSingleSignOnSettings",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
