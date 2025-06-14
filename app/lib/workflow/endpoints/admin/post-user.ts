import { z } from "zod";
import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

type RequestBody = Record<string, unknown>;

const ResponseSchema = z
  .unknown()
  .describe("Google Admin create user response");

export interface PostUserParams {
  body: RequestBody;
}
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
    paramsSchema: z.object({}).strict().describe("No path parameters"),
    responseSchema: ResponseSchema,
    body
  });
}
