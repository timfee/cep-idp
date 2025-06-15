import { createEndpoint } from "../factory";
const ParamsSchema = z.object({ tenantId: z.string(), ssoAppId: z.string() });
const ResponseSchema = z.string();
export const fetchMetadata = createEndpoint({
  connection: "public",
  method: "GET",
  pathTemplate: `/{tenantId}/federationmetadata/2007-06/federationmetadata.xml`,
  paramsSchema: ParamsSchema,
  responseSchema: ResponseSchema,
  queryParams: (params) => ({ appid: params.ssoAppId })
});
    pathTemplate: `/login.microsoftonline.com/${params.tenantId}/federationmetadata/2007-06/federationmetadata.xml`,
    params: {},
    paramsSchema: z.object({}),
    responseSchema: ResponseSchema,
    query
  });
}
