import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ userEmail: z.string().email() })
  .describe("Path parameter identifying the user by primary email");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin get user API response");

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
    pathTemplate: API_PATHS.USER_BY_EMAIL,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema
  });
}
