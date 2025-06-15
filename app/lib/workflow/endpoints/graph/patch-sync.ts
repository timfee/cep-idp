import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: z.record(z.unknown())
});

export const patchSync = createEndpoint({
  connection: "graphBeta",
  method: "PATCH",
  pathTemplate: API_PATHS.SYNC,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => params.body
});
    pathTemplate: API_PATHS.SYNC,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: GraphNoContentResponseSchema,
    body
  });
}
