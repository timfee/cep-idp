import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ customerId: z.string() });

const ResponseSchema = z.unknown();

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
