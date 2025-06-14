import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ ssoTemplateId: z.string() })
  .describe("Path parameter for SSO applicationTemplateId");

const ResponseSchema = z
  .unknown()
  .describe("Response from instantiate application SSO template endpoint");

export type InstantiateSSOParams = z.infer<typeof ParamsSchema>;
export type InstantiateSSOResponse = z.infer<typeof ResponseSchema>;

export async function instantiateSSO(
  ctx: ApiContext,
  params: InstantiateSSOParams
): Promise<InstantiateSSOResponse> {
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "POST",
    pathTemplate: API_PATHS.APP_BY_SSO_TEMPLATE,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
