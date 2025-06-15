import { z } from "zod";
import { API_PATHS } from "../../constants";
import { CreateOrgUnitBodySchema } from "../../schemas/requests";
import { OrgUnitSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  body: CreateOrgUnitBodySchema,
});

export type PostOUParams = z.infer<typeof ParamsSchema>;
export type PostOUResponse = z.infer<typeof OrgUnitSchema>;

export const postOU = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.ORG_UNITS,
  paramsSchema: ParamsSchema,
  responseSchema: OrgUnitSchema,
  bodyExtractor: (params) => params.body,
});
