import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  ssoTemplateId: z.string(),
});

const ResponseSchema = z.unknown();

export type AppByTemplateSSOParams = z.infer<typeof ParamsSchema>;
export type AppByTemplateSSOResponse = z.infer<typeof ResponseSchema>;

export async function appByTemplateSSO(
  ctx: ApiContext,
  params: AppByTemplateSSOParams
): Promise<AppByTemplateSSOResponse> {
  const { ssoTemplateId } = params;
  const query = {
    $filter: `applicationTemplateId eq '${ssoTemplateId}'`,
  } as Record<string, string>;

  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "GET",
    pathTemplate: "/applications",
    params: {},
    paramsSchema: z.object({}).strict(),
    responseSchema: ResponseSchema,
    query,
  });
}
