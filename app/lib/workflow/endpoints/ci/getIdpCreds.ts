import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  samlProfileId: z.string(),
});

const ResponseSchema = z.unknown();

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
    pathTemplate: "/inboundSamlSsoProfiles/{samlProfileId}/idpCredentials",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
