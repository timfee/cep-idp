import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  customerId: z.string(),
  body: z.record(z.unknown())
});
export const postRole = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.ROLES,
  paramsSchema: ParamsSchema,
  responseSchema: RoleSchema,
  bodyExtractor: (params) => params.body
});
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.ROLES,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: RoleSchema,
    body
  });
}
