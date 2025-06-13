import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  userEmail: z.string().email(),
});

const ResponseSchema = z.unknown();

export type GetUserParams = z.infer<typeof ParamsSchema>;
export type GetUserResponse = z.infer<typeof ResponseSchema>;

export async function getUser(
  ctx: ApiContext,
  params: GetUserParams
): Promise<GetUserResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: "/users/{userEmail}",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
