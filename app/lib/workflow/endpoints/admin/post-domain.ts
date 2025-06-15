import { z } from "zod";
import { API_PATHS } from "../../constants";
import { DomainSchema } from "../../schemas/responses";
import { createEndpoint } from "../factory";

const ParamsSchema = z.object({
  customerId: z.string(),
  body: z.object({
    domainName: z.string()
  })
});

export type PostDomainParams = z.infer<typeof ParamsSchema>;
export type PostDomainResponse = z.infer<typeof DomainSchema>;

export const postDomain = createEndpoint({
  connection: "googleAdmin",
  method: "POST",
  pathTemplate: API_PATHS.DOMAINS,
  paramsSchema: ParamsSchema,
  responseSchema: DomainSchema,
  bodyExtractor: (params) => params.body
});
