import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ResponseSchema = z
  .unknown()
  .describe("Graph list applications filtered by provisioning template");

export type AppByTemplateProvParams = { provisioningTemplateId: string };
export type AppByTemplateProvResponse = z.infer<typeof ResponseSchema>;

export async function appByTemplateProv(
  ctx: ApiContext,
  params: AppByTemplateProvParams
): Promise<AppByTemplateProvResponse> {
  const { provisioningTemplateId } = params;
  const query = {
    $filter: `applicationTemplateId eq '${provisioningTemplateId}'`
  } as Record<string, string>;

  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "GET",
    pathTemplate: API_PATHS.APPLICATIONS,
    params: {},
    paramsSchema: z.object({}).strict().describe("No path parameters"),
    responseSchema: ResponseSchema,
    query
  });
}
