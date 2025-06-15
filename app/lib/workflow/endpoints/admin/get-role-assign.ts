import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListRoleAssignmentsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  roleId: z.string().optional(),
  userKey: z.string().optional(),
});

export type GetRoleAssignParams = z.infer<typeof ParamsSchema>;
export type GetRoleAssignResponse = z.infer<
  typeof ListRoleAssignmentsResponseSchema
>;

export const getRoleAssign = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
  paramsSchema: ParamsSchema,
  responseSchema: ListRoleAssignmentsResponseSchema,
});
