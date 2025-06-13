import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  customerId: z.string(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type PostRoleParams = z.infer<typeof ParamsSchema>;
export type PostRoleResponse = z.infer<typeof ResponseSchema>;

export async function postRole(
  ctx: ApiContext,
  params: PostRoleParams
): Promise<PostRoleResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: "/customer/{customerId}/roles",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
