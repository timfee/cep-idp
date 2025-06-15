import { z } from "zod";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  tenantId: z.string(),
  ssoAppId: z.string()
});

const ResponseSchema = z.string();

export type FetchMetadataParams = z.infer<typeof ParamsSchema>;
export type FetchMetadataResponse = z.infer<typeof ResponseSchema>;

export const fetchMetadata = createEndpoint({
  connection: "public",
  method: "GET",
  pathTemplate: `/{tenantId}/federationmetadata/2007-06/federationmetadata.xml`,
  paramsSchema: ParamsSchema,
  responseSchema: ResponseSchema,
  queryParams: (params) => ({ appid: params.ssoAppId })
});
