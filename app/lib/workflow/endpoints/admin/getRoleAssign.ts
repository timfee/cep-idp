import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  customerId: z.string(),
  roleId: z.string().optional(),
  assignedTo: z.string().optional(),
});

const ResponseSchema = z.unknown();

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
    pathTemplate: "/customer/{customerId}/roleassignments",
    params: { customerId },
    paramsSchema: z.object({ customerId: z.string() }),
    responseSchema: ResponseSchema,
    query,
  });
}
