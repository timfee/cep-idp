import { z } from "zod";

import { API_PATHS } from "../../constants";
import { UserSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ userEmail: z.string().email() });

export type GetUserParams = z.infer<typeof ParamsSchema>;
export type GetUserResponse = z.infer<typeof UserSchema>;

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
    responseSchema: UserSchema
  });
}
