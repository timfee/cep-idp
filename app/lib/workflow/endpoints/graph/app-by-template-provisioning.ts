import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListApplicationsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";


export type AppByTemplateProvParams = z.infer<typeof ParamsSchema>;
export type AppByTemplateProvResponse = z.infer<typeof ListApplicationsResponseSchema>;

export const appByTemplateProv = createEndpoint({
  connection: "graphBeta",
  method: "GET",
  pathTemplate: API_PATHS.APPLICATIONS,
  paramsSchema: ParamsSchema,
  responseSchema: ListApplicationsResponseSchema
});
