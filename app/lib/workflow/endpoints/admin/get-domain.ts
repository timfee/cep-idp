import { z } from "zod";

import { API_PATHS } from "../../constants";
import { DomainSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  domainName: z.string(),
});

export type GetDomainParams = z.infer<typeof ParamsSchema>;
export type GetDomainResponse = z.infer<typeof DomainSchema>;

export const getDomain = createEndpoint({
  connection: "googleAdmin",
  method: "GET",
  pathTemplate: API_PATHS.DOMAIN_BY_NAME,
  paramsSchema: ParamsSchema,
  responseSchema: DomainSchema,
});
