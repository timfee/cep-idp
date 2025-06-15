import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: z.record(z.unknown())
});

export const linkPolicy = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.LINK_POLICY,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => params.body
});
    pathTemplate: API_PATHS.LINK_POLICY,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: GraphNoContentResponseSchema,
    body
  });
}
