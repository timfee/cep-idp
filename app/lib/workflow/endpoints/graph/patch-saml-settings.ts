import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("Partial SAML settings payload for PATCH update");

const ParamsSchema = z
  .object({ servicePrincipalId: z.string(), body: BodySchema })
  .describe("Path parameter identifying servicePrincipal and request body");

const ResponseSchema = z
  .unknown()
  .describe("No-content or minimal metadata response for SAML settings patch");

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
    pathTemplate: API_PATHS.SAML_SP_SETTINGS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: ResponseSchema,
    body
  });
}
