import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ servicePrincipalId: z.string(), jobId: z.string() })
  .describe("Path parameters to start a Graph sync job");

const ResponseSchema = z
  .unknown()
  .describe("Graph /start synchronizationJob operation response");

export type StartSyncJobParams = z.infer<typeof ParamsSchema>;
export type StartSyncJobResponse = z.infer<typeof ResponseSchema>;

export async function startSyncJob(
  ctx: ApiContext,
  params: StartSyncJobParams
): Promise<StartSyncJobResponse> {
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "POST",
    pathTemplate: API_PATHS.START_SYNC,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema
  });
}
