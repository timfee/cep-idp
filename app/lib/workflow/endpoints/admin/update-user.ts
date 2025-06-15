import { createEndpoint } from "../factory";
import { UpdateUserBodySchema } from "../../schemas/requests";
import { z } from "zod";

import { API_PATHS } from "../../constants";
import { UserSchema } from "../../schemas/responses";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ userEmail: z.string().email(), body: BodySchema });

export type UpdateUserParams = z.infer<typeof ParamsSchema>;
export type UpdateUserResponse = z.infer<typeof UserSchema>;

export async function updateUser(
  ctx: ApiContext,
  params: UpdateUserParams
): Promise<UpdateUserResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "PUT",
    pathTemplate: API_PATHS.USER_BY_EMAIL,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ userEmail: true }),
    responseSchema: UserSchema,
    body
  });
}
