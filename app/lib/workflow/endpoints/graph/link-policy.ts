import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("Graph body to link claimsMappingPolicy to servicePrincipal");

const ParamsSchema = z
  .object({ servicePrincipalId: z.string(), body: BodySchema })
  .describe("Path parameter for servicePrincipal plus request body");

const ResponseSchema = z
  .unknown()
  .describe("Microsoft Graph response for policy link operation");

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
    pathTemplate: API_PATHS.LINK_POLICY,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: ResponseSchema,
    body
  });
}
