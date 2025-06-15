import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListSamlProfilesResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({});

export type ListSamlProfilesParams = z.infer<typeof ParamsSchema>;
export type ListSamlProfilesResponse = z.infer<typeof ListSamlProfilesResponseSchema>;

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
    responseSchema: ListSamlProfilesResponseSchema
  });
}
