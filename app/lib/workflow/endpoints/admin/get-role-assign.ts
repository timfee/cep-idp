import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({
    customerId: z.string(),
    roleId: z.string().optional(),
    assignedTo: z.string().optional(),
  })
  .describe("Path and query parameters for role assignments lookup");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin list role assignments API response");

export type GetRoleAssignParams = z.infer<typeof ParamsSchema>;
export type GetRoleAssignResponse = z.infer<typeof ResponseSchema>;

export async function getRoleAssign(
  ctx: ApiContext,
  params: GetRoleAssignParams
): Promise<GetRoleAssignResponse> {
  const { customerId, roleId, assignedTo } = ParamsSchema.parse(params);
  const query: Record<string, string | undefined> = {};
  if (roleId) query.roleId = roleId;
  if (assignedTo) query.assignedTo = assignedTo;

  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
    params: { customerId },
    paramsSchema: z
      .object({ customerId: z.string() })
      .describe("Customer ID path parameter"),
    responseSchema: ResponseSchema,
    query,
  });
}
