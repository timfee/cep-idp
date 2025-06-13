import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  customerId: z.string(),
  orgUnitPath: z.string(),
});

const ResponseSchema = z.unknown();

export type GetOUParams = z.infer<typeof ParamsSchema>;
export type GetOUResponse = z.infer<typeof ResponseSchema>;

export async function getOU(
  ctx: ApiContext,
  params: GetOUParams
): Promise<GetOUResponse> {
  return callEndpoint({
    ctx,
    connection: "googleAdmin",
    method: "GET",
    pathTemplate: API_PATHS.ORG_UNIT,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
