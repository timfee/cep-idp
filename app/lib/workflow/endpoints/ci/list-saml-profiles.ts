import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({})
  .describe("No parameters required for list inbound SAML profiles");

const ResponseSchema = z
  .unknown()
  .describe("Cloud Identity listInboundSamlSsoProfiles API response payload");

export type ListSamlProfilesParams = z.infer<typeof ParamsSchema>;
export type ListSamlProfilesResponse = z.infer<typeof ResponseSchema>;

export async function listSamlProfiles(
  ctx: ApiContext,
  _params: ListSamlProfilesParams = {}
): Promise<ListSamlProfilesResponse> {
  return callEndpoint({
    ctx,
    connection: "googleCI",
    method: "GET",
    pathTemplate: API_PATHS.SAML_PROFILES,
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
