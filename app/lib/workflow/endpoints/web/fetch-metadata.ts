import { z } from "zod";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  tenantId: z.string(),
  ssoAppId: z.string()
});

const ResponseSchema = z.string().describe("Raw FederationMetadata.xml document");

export type FetchMetadataParams = z.infer<typeof ParamsSchema>;
export type FetchMetadataResponse = z.infer<typeof ResponseSchema>;

export async function fetchMetadata(
  ctx: ApiContext,
  params: FetchMetadataParams
): Promise<FetchMetadataResponse> {
  const query = {
    appid: params.ssoAppId
  };
  return callEndpoint({
    ctx,
    connection: "public",
    method: "GET",
    pathTemplate: `/login.microsoftonline.com/${params.tenantId}/federationmetadata/2007-06/federationmetadata.xml`,
    params: {},
    paramsSchema: z.object({}),
    responseSchema: ResponseSchema,
    query
  });
}
