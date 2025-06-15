import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListDomainsResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListDomainsParams = z.infer<typeof ParamsSchema>;
export type ListDomainsResponse = z.infer<typeof ListDomainsResponseSchema>;
export async function listDomains(
  ctx: ApiContext,
  params: ListDomainsParams
): Promise<ListDomainsResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.DOMAINS,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ListDomainsResponseSchema
  });
}
