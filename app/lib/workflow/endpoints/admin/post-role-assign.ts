import { createEndpoint } from "../factory";
import { RoleAssignmentBodySchema } from "../../schemas/requests";
import { z } from "zod";

import { API_PATHS } from "../../constants";
import { RoleAssignmentSchema } from "../../schemas/responses";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ customerId: z.string(), body: BodySchema });

export type PostRoleAssignParams = z.infer<typeof ParamsSchema>;
export type PostRoleAssignResponse = z.infer<typeof RoleAssignmentSchema>;

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
    responseSchema: RoleAssignmentSchema,
    body
  });
}
