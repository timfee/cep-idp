import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  provTemplateId: z.string(),
});

const ResponseSchema = z.unknown();

export type InstantiateProvParams = z.infer<typeof ParamsSchema>;
export type InstantiateProvResponse = z.infer<typeof ResponseSchema>;

export async function instantiateProv(
  ctx: ApiContext,
  params: InstantiateProvParams
): Promise<InstantiateProvResponse> {
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "POST",
    pathTemplate: API_PATHS.APP_BY_PROV_TEMPLATE,
    params,
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
