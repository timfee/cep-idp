import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  userEmail: z.string().email(),
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type UpdateUserParams = z.infer<typeof ParamsSchema>;
export type UpdateUserResponse = z.infer<typeof ResponseSchema>;

export async function updateUser(
  ctx: ApiContext,
  params: UpdateUserParams
): Promise<UpdateUserResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "PUT",
    pathTemplate: "/users/{userEmail}",
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ userEmail: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
