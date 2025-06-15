import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListOrgUnitsResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListOUAutomationParams = z.infer<typeof ParamsSchema>;
export type ListOUAutomationResponse = z.infer<typeof ListOrgUnitsResponseSchema>;

export async function listOUAutomation(
  ctx: ApiContext,
  params: ListOUAutomationParams
): Promise<ListOUAutomationResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.ORG_UNITS,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ListOrgUnitsResponseSchema,
    query: { orgUnitPath: "/Automation", type: "children" }
  });
}
