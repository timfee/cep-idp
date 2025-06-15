import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({ provisioningTemplateId: z.string() })
  .describe("Path parameter for provisioning applicationTemplateId");

const ResponseSchema = z
  .unknown()
  .describe("Response from instantiate application provisioning template");

export type InstantiateProvParams = z.infer<typeof ParamsSchema>;
export type InstantiateProvResponse = z.infer<typeof ResponseSchema>;

export async function instantiateProv(
  ctx: ApiContext,
  params: InstantiateProvParams
): Promise<InstantiateProvResponse> {
  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "POST",
    pathTemplate: API_PATHS.APP_BY_PROV_TEMPLATE,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema
  });
}
