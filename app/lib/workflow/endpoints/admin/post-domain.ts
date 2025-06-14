import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown()).describe("JSON payload to add domain");

const ParamsSchema = z
  .object({ customerId: z.string(), body: BodySchema })
  .describe("Customer ID path parameter and request body");

const ResponseSchema = z.unknown().describe("Google Admin add domain response");

export type PostDomainParams = z.infer<typeof ParamsSchema>;
export type PostDomainResponse = z.infer<typeof ResponseSchema>;

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
    responseSchema: ResponseSchema,
    body,
  });
}
