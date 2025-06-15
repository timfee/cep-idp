import { createEndpoint } from "../factory";
const ParamsSchema = z.object({
  customerId: z.string(),
  body: z.object({ domainName: z.string() })
});

export const postDomain = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.DOMAINS,
  paramsSchema: ParamsSchema,
  responseSchema: DomainSchema,
  bodyExtractor: (params) => params.body
});
    pathTemplate: API_PATHS.DOMAINS,
    params: pathParams,
    paramsSchema: ParamsSchema.pick({ customerId: true }),
    responseSchema: DomainSchema,
    body
  });
}
