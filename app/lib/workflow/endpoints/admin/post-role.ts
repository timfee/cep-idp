import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("JSON payload to create an Admin role");

const ParamsSchema = z
  .object({ customerId: z.string(), body: BodySchema })
  .describe("Customer ID path parameter and request body");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin create role operation response");

export type PostRoleParams = z.infer<typeof ParamsSchema>;
export type PostRoleResponse = z.infer<typeof ResponseSchema>;

export async function postRole(
  ctx: ApiContext,
  params: PostRoleParams
): Promise<PostRoleResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.ROLES,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
