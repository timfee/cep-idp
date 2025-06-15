import { z } from "zod";

import { API_PATHS } from "../../constants";
import { GraphNoContentResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ servicePrincipalId: z.string(), body: BodySchema });

const ResponseSchema = GraphNoContentResponseSchema;

export type PatchSamlSettingsParams = z.infer<typeof ParamsSchema>;
export type PatchSamlSettingsResponse = z.infer<typeof GraphNoContentResponseSchema>;

export async function patchSamlSettings(
  ctx: ApiContext,
  params: PatchSamlSettingsParams
): Promise<PatchSamlSettingsResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "PATCH",
    pathTemplate: API_PATHS.SAML_SP_SETTINGS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: GraphNoContentResponseSchema,
    body
  });
}
