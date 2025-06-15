import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListRoleAssignmentsResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  customerId: z.string(),
  roleId: z.string().optional(),
  userKey: z.string().optional()
});

export type GetRoleAssignParams = z.infer<typeof ParamsSchema>;
export type GetRoleAssignResponse = z.infer<typeof ListRoleAssignmentsResponseSchema>;

export async function getRoleAssign(
  ctx: ApiContext,
  params: GetRoleAssignParams
): Promise<GetRoleAssignResponse> {
  const { customerId, roleId, userKey } = ParamsSchema.parse(params);
  const query: Record<string, string | undefined> = {};
  if (roleId) query.roleId = roleId;
  if (userKey) query.userKey = userKey;

  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
    params: { customerId },
    paramsSchema: z.object({ customerId: z.string() }),
    responseSchema: ListRoleAssignmentsResponseSchema,
    query
  });
}
