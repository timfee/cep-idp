import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  customerId: z.string(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type PostRoleAssignParams = z.infer<typeof ParamsSchema>;
export type PostRoleAssignResponse = z.infer<typeof ResponseSchema>;

export async function postRoleAssign(
  ctx: ApiContext,
  params: PostRoleAssignParams
): Promise<PostRoleAssignResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: "/customer/{customerId}/roleassignments",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
