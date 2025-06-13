import { z } from "zod";

import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z.object({});
const ResponseSchema = z.unknown();

export type ListAppTemplatesParams = z.infer<typeof ParamsSchema>;
export type ListAppTemplatesResponse = z.infer<typeof ResponseSchema>;

export async function listAppTemplates(
  ctx: ApiContext,
  _params: ListAppTemplatesParams = {}
): Promise<ListAppTemplatesResponse> {
  return callEndpoint({
    ctx,
    connection: "graphGA",
    method: "GET",
    pathTemplate: "/applicationTemplates",
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
