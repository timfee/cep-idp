import { z } from "zod";

import { API_PATHS } from "../../constants";
import { ListDomainsResponseSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({ customerId: z.string() });

export type ListDomainsParams = z.infer<typeof ParamsSchema>;
export type ListDomainsResponse = z.infer<typeof ListDomainsResponseSchema>;
export const listDomains = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.DOMAINS,
  paramsSchema: ParamsSchema,
  responseSchema: ListDomainsResponseSchema
});
