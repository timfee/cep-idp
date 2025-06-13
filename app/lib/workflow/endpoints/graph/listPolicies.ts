import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
});

const ResponseSchema = z.unknown();

export type ListPoliciesParams = z.infer<typeof ParamsSchema>;
export type ListPoliciesResponse = z.infer<typeof ResponseSchema>;

export async function listPolicies(
  ctx: ApiContext,
  params: ListPoliciesParams
): Promise<ListPoliciesResponse> {
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "GET",
    pathTemplate: API_PATHS.TOKEN_POLICIES,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
