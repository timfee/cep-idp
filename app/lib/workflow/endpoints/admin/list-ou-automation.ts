import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListOrgUnitsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListOUAutomationParams = z.infer<typeof ParamsSchema>;
export type ListOUAutomationResponse = z.infer<
  typeof ListOrgUnitsResponseSchema
>;
export const listOUAutomation = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.ORG_UNITS,
  paramsSchema: ParamsSchema,
  responseSchema: ListOrgUnitsResponseSchema,
  queryParams: () => ({ orgUnitPath: "/Automation" }),
});
