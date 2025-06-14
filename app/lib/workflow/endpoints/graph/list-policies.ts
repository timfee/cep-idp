import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ servicePrincipalId: z.string() })
  .describe("Path parameter for servicePrincipal to list linked policies");

const ResponseSchema = z
  .unknown()
  .describe("Microsoft Graph list token policies response payload");

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
    responseSchema: ResponseSchema
  });
}
