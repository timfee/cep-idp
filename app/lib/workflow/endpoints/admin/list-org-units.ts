import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListOrgUnitsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  orgUnitPath: z.string().optional(),
  type: z.string().optional(),
});

export type ListOrgUnitsParams = z.infer<typeof ParamsSchema>;
export type ListOrgUnitsResponse = z.infer<typeof ListOrgUnitsResponseSchema>;

export const listOrgUnits = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.ORG_UNITS,
  paramsSchema: ParamsSchema,
  responseSchema: ListOrgUnitsResponseSchema,
});
