import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListApplicationsResponseSchema } from "../../schemas/responses";
import { ApiContext, callEndpoint } from "../utils";

const ResponseSchema = ListApplicationsResponseSchema;

export type AppByTemplateSSOParams = { ssoTemplateId: string };
export type AppByTemplateSSOResponse = z.infer<typeof ListApplicationsResponseSchema>;

export async function appByTemplateSSO(
  ctx: ApiContext,
  params: AppByTemplateSSOParams
): Promise<AppByTemplateSSOResponse> {
  const { ssoTemplateId } = params;
  const query = {
    $filter: `applicationTemplateId eq '${ssoTemplateId}'`
  } as Record<string, string>;

  return callEndpoint({
    ctx,
    connection: "graphBeta",
    method: "GET",
    pathTemplate: API_PATHS.APPLICATIONS,
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: ListApplicationsResponseSchema,
    query
  });
}
