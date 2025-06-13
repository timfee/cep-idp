import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type LinkPolicyParams = z.infer<typeof ParamsSchema>;
export type LinkPolicyResponse = z.infer<typeof ResponseSchema>;

export async function linkPolicy(
  ctx: ApiContext,
  params: LinkPolicyParams
): Promise<LinkPolicyResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate:
      "/servicePrincipals/{servicePrincipalId}/tokenIssuancePolicies/$ref",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
