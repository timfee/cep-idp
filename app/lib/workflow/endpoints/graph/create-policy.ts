import { createEndpoint } from "../factory";
const ParamsSchema = z.object({ body: z.record(z.unknown()) });
export type CreatePolicyParams = z.infer<typeof ParamsSchema>;

export const createPolicy = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.CREATE_TOKEN_POLICY,
  paramsSchema: ParamsSchema,
  responseSchema: CreatePolicyResponseSchema,
  bodyExtractor: (params) => params.body
});
    pathTemplate: API_PATHS.CREATE_TOKEN_POLICY,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: CreatePolicyResponseSchema,
    body
  });
}
