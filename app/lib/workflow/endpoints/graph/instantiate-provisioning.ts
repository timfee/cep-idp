import { createEndpoint } from "../factory";
import { z } from "zod";

import { API_PATHS } from "../../constants";
import { InstantiateAppResponseSchema } from "../../schemas/responses";

const ParamsSchema = z.object({ provisioningTemplateId: z.string() });

const ResponseSchema = InstantiateAppResponseSchema;

export type InstantiateProvParams = z.infer<typeof ParamsSchema>;
export type InstantiateProvResponse = z.infer<typeof InstantiateAppResponseSchema>;

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
    responseSchema: InstantiateAppResponseSchema
  });
}
