import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListRolesResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListRolesParams = z.infer<typeof ParamsSchema>;
export type ListRolesResponse = z.infer<typeof ListRolesResponseSchema>;

export const listRoles = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.ROLES,
  paramsSchema: ParamsSchema,
  responseSchema: ListRolesResponseSchema,
});
