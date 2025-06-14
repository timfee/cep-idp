import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ customerId: z.string() })
  .describe("Customer ID path parameter for roles list");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin list roles API response");

export type ListRolesParams = z.infer<typeof ParamsSchema>;
export type ListRolesResponse = z.infer<typeof ResponseSchema>;

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
    responseSchema: ResponseSchema,
  });
}
