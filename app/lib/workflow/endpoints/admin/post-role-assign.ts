import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const BodySchema = z
  .record(z.unknown())
  .describe("JSON payload to create a role assignment");

const ParamsSchema = z
  .object({ customerId: z.string(), body: BodySchema })
  .describe("Customer ID path parameter and request body");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin create role assignment operation response");

export type PostRoleAssignParams = z.infer<typeof ParamsSchema>;
export type PostRoleAssignResponse = z.infer<typeof ResponseSchema>;

export async function postRoleAssign(
  ctx: ApiContext,
  params: PostRoleAssignParams
): Promise<PostRoleAssignResponse> {
  const { body, ...pathParams } = params;
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: ResponseSchema,
    body,
  });
}
