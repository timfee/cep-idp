import { z } from "zod";
import { API_PATHS } from "../../constants";
import { InstantiateAppResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  provisioningTemplateId: z.string(),
  body: z.object({ displayName: z.string() }).optional(),
});

export type InstantiateProvParams = z.infer<typeof ParamsSchema>;
export type InstantiateProvResponse = z.infer<
  typeof InstantiateAppResponseSchema
>;

export const instantiateProv = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.APP_BY_PROV_TEMPLATE,
  paramsSchema: ParamsSchema,
  responseSchema: InstantiateAppResponseSchema,
  bodyExtractor: (params) =>
    params.body || { displayName: "Google Workspace Provisioning" },
});
