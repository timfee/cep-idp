import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  customerId: z.string(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type PostOUParams = z.infer<typeof ParamsSchema>;
export type PostOUResponse = z.infer<typeof ResponseSchema>;

export async function postOU(
  ctx: ApiContext,
  params: PostOUParams
): Promise<PostOUResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: "/customer/{customerId}/orgunits",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
