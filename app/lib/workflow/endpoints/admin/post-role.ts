import { z } from "zod";
import { API_PATHS } from "../../constants";
import { CreateRoleBodySchema } from "../../schemas/requests";
import { RoleSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  body: CreateRoleBodySchema,
});

export type PostRoleParams = z.infer<typeof ParamsSchema>;
export type PostRoleResponse = z.infer<typeof RoleSchema>;

export const postRole = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.ROLES,
  paramsSchema: ParamsSchema,
  responseSchema: RoleSchema,
  bodyExtractor: (params) => params.body,
});
