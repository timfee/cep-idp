import { createEndpoint } from "../factory";
import { CreateRoleBodySchema } from "../../schemas/requests";
import { z } from "zod";

import { API_PATHS } from "../../constants";
import { RoleSchema } from "../../schemas/responses";

const BodySchema = z.record(z.unknown());

const ParamsSchema = z.object({ customerId: z.string(), body: BodySchema });

export type PostRoleParams = z.infer<typeof ParamsSchema>;
export type PostRoleResponse = z.infer<typeof RoleSchema>;

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
    responseSchema: RoleSchema,
    body
  });
}
