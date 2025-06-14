import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  tenantId: z.string(),
  ssoAppId: z.string(),
});

const ResponseSchema = z.string(); // XML response

export type FetchMetadataParams = z.infer<typeof ParamsSchema>;
export type FetchMetadataResponse = z.infer<typeof ResponseSchema>;

export async function fetchMetadata(
  ctx: ApiContext,
  params: FetchMetadataParams
): Promise<FetchMetadataResponse> {
  const { tenantId, ssoAppId } = params;
  const path = `/login.microsoftonline.com/${tenantId}/federationmetadata/2007-06/federationmetadata.xml?appid=${encodeURIComponent(
    ssoAppId
  )}`;

  return callEndpoint({
    ctx,
    connection: "public",
    method: "GET",
    pathTemplate: path,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: ResponseSchema,
  });
}
