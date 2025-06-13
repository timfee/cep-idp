import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({
  provTemplateId: z.string(),
});

const ResponseSchema = z.unknown();

export type AppByTemplateProvParams = z.infer<typeof ParamsSchema>;
export type AppByTemplateProvResponse = z.infer<typeof ResponseSchema>;

export async function appByTemplateProv(
  ctx: ApiContext,
  params: AppByTemplateProvParams
): Promise<AppByTemplateProvResponse> {
  const { provTemplateId } = params;
  const query = {
    $filter: `applicationTemplateId eq '${provTemplateId}'`,
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
