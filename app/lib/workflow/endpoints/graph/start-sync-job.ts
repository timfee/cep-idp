import { createEndpoint } from "../factory";
import { z } from "zod";

import { API_PATHS } from "../../constants";
import { GraphNoContentResponseSchema } from "../../schemas/responses";

const ParamsSchema = z.object({ servicePrincipalId: z.string(), jobId: z.string() });

const ResponseSchema = GraphNoContentResponseSchema;

export type StartSyncJobParams = z.infer<typeof ParamsSchema>;
export type StartSyncJobResponse = z.infer<typeof GraphNoContentResponseSchema>;

export async function startSyncJob(
  ctx: ApiContext,
  params: StartSyncJobParams
): Promise<StartSyncJobResponse> {
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate: API_PATHS.START_SYNC,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: GraphNoContentResponseSchema
  });
}
