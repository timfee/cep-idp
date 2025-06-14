import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({
  body: BodySchema,
});

const ResponseSchema = z.unknown();

export type PostUserParams = z.infer<typeof ParamsSchema>;
export type PostUserResponse = z.infer<typeof ResponseSchema>;

export async function postUser(
  ctx: ApiContext,
  params: PostUserParams
): Promise<PostUserResponse> {
  const { body } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.USERS_ROOT,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: ResponseSchema,
    body,
  });
}
