import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListRolesResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListRolesParams = z.infer<typeof ParamsSchema>;
export type ListRolesResponse = z.infer<typeof ListRolesResponseSchema>;

export async function listRoles(
  ctx: ApiContext,
  params: ListRolesParams
): Promise<ListRolesResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.ROLES,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ListRolesResponseSchema
  });
}
