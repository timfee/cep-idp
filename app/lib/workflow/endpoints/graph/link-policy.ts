import { z } from "zod";

import { API_PATHS } from "../../constants";
import { GraphNoContentResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ servicePrincipalId: z.string(), body: BodySchema });

const ResponseSchema = GraphNoContentResponseSchema;

export type LinkPolicyParams = z.infer<typeof ParamsSchema>;
export type LinkPolicyResponse = z.infer<typeof GraphNoContentResponseSchema>;

export async function linkPolicy(
  ctx: ApiContext,
  params: LinkPolicyParams
): Promise<LinkPolicyResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate: API_PATHS.LINK_POLICY,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: GraphNoContentResponseSchema,
    body
  });
}
