import { z } from "zod";

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
    pathTemplate:
      "/servicePrincipals/{servicePrincipalId}/tokenIssuancePolicies",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
