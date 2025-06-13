import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  customerId: z.string(),
  orgUnitPath: z.string().optional(),
  type: z.string().optional(),
});

const ResponseSchema = z.unknown();

export type ListOrgUnitsParams = z.infer<typeof ParamsSchema>;
export type ListOrgUnitsResponse = z.infer<typeof ResponseSchema>;

export async function listOrgUnits(
  ctx: ApiContext,
  params: ListOrgUnitsParams
): Promise<ListOrgUnitsResponse> {
  const { orgUnitPath, type, ...pathParams } = params;
  const query: Record<string, string | undefined> = {};
  if (orgUnitPath) query.orgUnitPath = orgUnitPath;
  if (type) query.type = type;

  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.ORG_UNITS,
    params: pathParams as { customerId: string },
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: ResponseSchema,
    query,
  });
}
