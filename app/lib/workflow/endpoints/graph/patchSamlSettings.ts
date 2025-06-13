import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type PatchSamlSettingsParams = z.infer<typeof ParamsSchema>;
export type PatchSamlSettingsResponse = z.infer<typeof ResponseSchema>;

export async function patchSamlSettings(
  ctx: ApiContext,
  params: PatchSamlSettingsParams
): Promise<PatchSamlSettingsResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "PATCH",
    pathTemplate:
      "/servicePrincipals/{servicePrincipalId}/samlSingleSignOnSettings",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
