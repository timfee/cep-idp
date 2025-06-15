import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  jobId: z.string()
});

export const startSyncJob = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.START_SYNC,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => undefined
});
    method: "POST",
    pathTemplate: API_PATHS.START_SYNC,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: GraphNoContentResponseSchema
  });
}
