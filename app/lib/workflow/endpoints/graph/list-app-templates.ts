import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ApiContext, callEndpoint } from "../utils";

const ParamsSchema = z
  .object({})
  .describe("No parameters required for list application templates");
const ResponseSchema = z
  .unknown()
  .describe("Microsoft Graph list application templates API response");

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
    responseSchema: ResponseSchema
  });
}
