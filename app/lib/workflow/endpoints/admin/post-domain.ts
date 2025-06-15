import { z } from "zod";

import { API_PATHS } from "../../constants";
import { DomainSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ customerId: z.string(), body: BodySchema });

export type PostDomainParams = z.infer<typeof ParamsSchema>;
export type PostDomainResponse = z.infer<typeof DomainSchema>;

export async function postDomain(
  ctx: ApiContext,
  params: PostDomainParams
): Promise<PostDomainResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.DOMAINS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: DomainSchema,
    body
  });
}
