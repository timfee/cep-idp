import { CreateOrgUnitBodySchema } from "../../schemas/requests";
import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  customerId: z.string(),
  body: CreateOrgUnitBodySchema
});
export const postOU = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.ORG_UNITS,
  paramsSchema: ParamsSchema,
  responseSchema: OrgUnitSchema,
  bodyExtractor: (params) => params.body
});
    connection: "googleAdmin",
    method: "POST",
    pathTemplate: API_PATHS.ORG_UNITS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: OrgUnitSchema,
    body
  });
}
