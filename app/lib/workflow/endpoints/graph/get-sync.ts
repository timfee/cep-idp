import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ servicePrincipalId: z.string() })
  .describe("Path parameter identifying the Service Principal");

const ResponseSchema = z
  .unknown()
  .describe("Microsoft Graph synchronization status response payload");

export type GetSyncParams = z.infer<typeof ParamsSchema>;
export type GetSyncResponse = z.infer<typeof ResponseSchema>;

export async function getSync(
  ctx: ApiContext,
  params: GetSyncParams
): Promise<GetSyncResponse> {
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "GET",
    pathTemplate: API_PATHS.SYNC,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
