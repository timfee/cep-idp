import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({});
const ResponseSchema = z.unknown();

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
    pathTemplate: "/inboundSamlSsoProfiles",
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
