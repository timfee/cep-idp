import { z } from "zod";
import { API_PATHS } from "../../constants";
import { UserSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

type RequestBody = Record<string, unknown>;



export interface PostUserParams {
  body: RequestBody;
}
export type PostUserResponse = z.infer<typeof UserSchema>;

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
    responseSchema: UserSchema,
    body
  });
}
