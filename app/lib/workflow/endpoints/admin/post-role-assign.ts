import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  customerId: z.string(),
  body: z.record(z.unknown())
});
export const postRoleAssign = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
  paramsSchema: ParamsSchema,
  responseSchema: RoleAssignmentSchema,
  bodyExtractor: (params) => params.body
});
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.ROLE_ASSIGNMENTS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: RoleAssignmentSchema,
    body
  });
}
