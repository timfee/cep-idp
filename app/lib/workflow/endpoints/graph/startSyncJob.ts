import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  jobId: z.string(),
});

const ResponseSchema = z.unknown();

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
    pathTemplate:
      "/servicePrincipals/{servicePrincipalId}/synchronization/jobs/{jobId}/start",
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
