import { createEndpoint } from "../factory";
import { z } from "zod";

import { API_PATHS } from "../../constants";
import { InstantiateAppResponseSchema } from "../../schemas/responses";

const ParamsSchema = z.object({ ssoTemplateId: z.string() });

const ResponseSchema = InstantiateAppResponseSchema;

export type InstantiateSSOParams = z.infer<typeof ParamsSchema>;
export type InstantiateSSOResponse = z.infer<typeof InstantiateAppResponseSchema>;

export async function instantiateSSO(
  ctx: ApiContext,
  params: InstantiateSSOParams
): Promise<InstantiateSSOResponse> {
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate: API_PATHS.APP_BY_SSO_TEMPLATE,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: InstantiateAppResponseSchema
  });
}
