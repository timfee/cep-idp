import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ResponseSchema = z
  .string()
  .describe("Raw FederationMetadata.xml document returned by Azure AD");

export interface FetchMetadataParams {
  tenantId: string;
  ssoAppId: string;
}
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
    paramsSchema: z
      .object({})
      .strict()
      .describe("No additional path parameters; URL constructed inline"),
    responseSchema: ResponseSchema
  });
}
