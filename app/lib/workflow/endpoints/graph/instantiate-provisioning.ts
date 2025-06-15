import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  provisioningTemplateId: z.string(),
  body: z.object({ displayName: z.string() }).optional()
});

export type InstantiateProvResponse = z.infer<
  typeof InstantiateAppResponseSchema
>;

export const instantiateProv = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.APP_BY_PROV_TEMPLATE,
  paramsSchema: ParamsSchema,
  responseSchema: InstantiateAppResponseSchema,
  bodyExtractor: (params) =>
    params.body || { displayName: "Google Workspace Provisioning" }
});
    params,
    paramsSchema: ParamsSchema,
    responseSchema: InstantiateAppResponseSchema
  });
}
