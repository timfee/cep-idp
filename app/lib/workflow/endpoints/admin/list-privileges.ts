import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ customerId: z.string() })
  .describe("Customer ID path parameter for privileges list");

const ResponseSchema = z
  .unknown()
  .describe("Google Admin list privileges API response");

export type ListPrivilegesParams = z.infer<typeof ParamsSchema>;
export type ListPrivilegesResponse = z.infer<typeof ResponseSchema>;

export async function listPrivileges(
  ctx: ApiContext,
  params: ListPrivilegesParams
): Promise<ListPrivilegesResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.PRIVILEGES,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
