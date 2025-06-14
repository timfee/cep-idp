import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ samlProfileId: z.string() })
  .describe("Path parameter identifying the inbound SAML profile");

const ResponseSchema = z
  .unknown()
  .describe("Cloud Identity list IdP certificates API response payload");

export type GetIdpCredsParams = z.infer<typeof ParamsSchema>;
export type GetIdpCredsResponse = z.infer<typeof ResponseSchema>;

export async function getIdpCreds(
  ctx: ApiContext,
  params: GetIdpCredsParams
): Promise<GetIdpCredsResponse> {
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "GET",
    pathTemplate: API_PATHS.IDP_CREDENTIALS,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
