import { z } from "zod";

import { API_PATHS } from "../../constants";
import { OrgUnitSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  orgUnitPath: z.string(),
});

export type GetOUParams = z.infer<typeof ParamsSchema>;
export type GetOUResponse = z.infer<typeof OrgUnitSchema>;

export const getOU = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.ORG_UNIT,
  paramsSchema: ParamsSchema,
  responseSchema: OrgUnitSchema,
});
