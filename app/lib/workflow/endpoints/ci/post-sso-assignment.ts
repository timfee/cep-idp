import { createEndpoint } from "../factory";
const ParamsSchema = z.object({ body: z.record(z.unknown()) });
export type PostSsoAssignmentParams = z.infer<typeof ParamsSchema>;

export const postSsoAssignment = createEndpoint({
  connection: "googleCI",
  method: "POST",
  pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
  paramsSchema: ParamsSchema,
  responseSchema: OperationResponseSchema,
  bodyExtractor: (params) => params.body
});
    pathTemplate: API_PATHS.SSO_ASSIGNMENTS,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: OperationResponseSchema,
    body
  });
}
