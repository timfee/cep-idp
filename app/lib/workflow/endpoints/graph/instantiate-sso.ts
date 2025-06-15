import { z } from "zod";
import { API_PATHS } from "../../constants";
import { InstantiateAppResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  ssoTemplateId: z.string(),
  body: z.object({ displayName: z.string() }).optional(),
});

export type InstantiateSSOParams = z.infer<typeof ParamsSchema>;
export type InstantiateSSOResponse = z.infer<
  typeof InstantiateAppResponseSchema
>;

export const instantiateSSO = createEndpoint({
  connection: "graphBeta",
  method: "POST",
  pathTemplate: API_PATHS.APP_BY_SSO_TEMPLATE,
  paramsSchema: ParamsSchema,
  responseSchema: InstantiateAppResponseSchema,
  bodyExtractor: (params) =>
    params.body || { displayName: "Google Workspace SSO" },
});
