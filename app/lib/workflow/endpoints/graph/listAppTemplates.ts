import { z } from "zod";

import { API_PATHS } from "../../constants";
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
    pathTemplate: API_PATHS.APP_TEMPLATES,
    params: {},
    paramsSchema: ParamsSchema,
    responseSchema: ResponseSchema,
  });
}
