import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  servicePrincipalId: z.string(),
  body: z.record(z.unknown())
});

export type PatchSamlSettingsResponse = z.infer<
  typeof GraphNoContentResponseSchema
>;

export const patchSamlSettings = createEndpoint({
  connection: "graphBeta",
  method: "PATCH",
  pathTemplate: API_PATHS.SAML_SP_SETTINGS,
  paramsSchema: ParamsSchema,
  responseSchema: GraphNoContentResponseSchema,
  bodyExtractor: (params) => params.body
});
    paramsSchema: ParamsSchema.pick({ servicePrincipalId: true }),
    responseSchema: GraphNoContentResponseSchema,
    body
  });
}
