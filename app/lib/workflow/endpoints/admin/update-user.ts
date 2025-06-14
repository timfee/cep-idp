import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("Partial user update payload");

const ParamsSchema = z
  .object({ userEmail: z.string().email(), body: BodySchema })
  .describe("User email path param plus update body");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin update user response");

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
    pathTemplate: API_PATHS.USER_BY_EMAIL,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ userEmail: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
