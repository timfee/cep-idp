import { createEndpoint } from "../factory";
const ParamsSchema = z.object({ body: z.record(z.unknown()) });
export type CreateSamlProfileParams = z.infer<typeof ParamsSchema>;

export const createSamlProfile = createEndpoint({
  connection: "googleCI",
  method: "POST",
  pathTemplate: API_PATHS.SAML_PROFILES,
  paramsSchema: ParamsSchema,
  responseSchema: OperationResponseSchema,
  bodyExtractor: (params) => params.body
});
    pathTemplate: API_PATHS.SAML_PROFILES,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: OperationResponseSchema,
    body
  });
}
