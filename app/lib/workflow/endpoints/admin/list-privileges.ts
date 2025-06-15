import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListPrivilegesResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListPrivilegesParams = z.infer<typeof ParamsSchema>;
export type ListPrivilegesResponse = z.infer<
  typeof ListPrivilegesResponseSchema
>;

export const listPrivileges = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.PRIVILEGES,
  paramsSchema: ParamsSchema,
  responseSchema: ListPrivilegesResponseSchema,
});
