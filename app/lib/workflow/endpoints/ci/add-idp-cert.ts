import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  samlProfileId: z.string(),
  body: z.record(z.unknown())
});
export const addIdpCert = createEndpoint({
  connection: "googleCI",
  method: "POST",
  pathTemplate: API_PATHS.ADD_IDP_CREDENTIALS,
  paramsSchema: ParamsSchema,
  responseSchema: OperationResponseSchema,
  bodyExtractor: (params) => params.body
});
    connection: "googleCI",
    method: "POST",
    pathTemplate: API_PATHS.ADD_IDP_CREDENTIALS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ samlProfileId: true }),
    responseSchema: OperationResponseSchema,
    body
  });
}
