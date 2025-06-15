import { z } from "zod";
import { API_PATHS } from "../../constants";
import { RoleAssignmentBodySchema } from "../../schemas/requests";
import { RoleAssignmentSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  body: RoleAssignmentBodySchema,
});

export type PostRoleAssignParams = z.infer<typeof ParamsSchema>;
export type PostRoleAssignResponse = z.infer<typeof RoleAssignmentSchema>;

export const postRoleAssign = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
  paramsSchema: ParamsSchema,
  responseSchema: RoleAssignmentSchema,
  bodyExtractor: (params) => params.body,
});
