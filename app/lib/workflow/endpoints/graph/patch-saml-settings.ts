import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListApplicationsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({});

export type ListAppTemplatesParams = z.infer<typeof ParamsSchema>;
export type ListAppTemplatesResponse = z.infer<
  typeof ListApplicationsResponseSchema
>;

export const listAppTemplates = createEndpoint({
  connection: "graphBeta",
  method: "GET",
  pathTemplate: API_PATHS.APP_TEMPLATES,
  paramsSchema: ParamsSchema,
  responseSchema: ListApplicationsResponseSchema,
});
